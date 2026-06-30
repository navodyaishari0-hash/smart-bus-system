const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cron = require('node-cron');

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Asia/Colombo'");
});

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  ...(process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()),
  'https://probably-kids-medal-bind.trycloudflare.com',
  /\.trycloudflare\.com$/,
  /\.vercel\.app$/
];
const corsCheck = (o, cb) => {
  if (!o || allowedOrigins.some(a => typeof a === 'string' ? a === o : a.test(o))) return cb(null, true);
  cb(null, false);
};
const io = new Server(server, { cors: { origin: corsCheck, methods: ['GET','POST','PATCH','DELETE'], credentials: true } });
app.set('io', io);
app.use((req, res, next) => { req.io = io; next(); });
app.use(cors({ origin: corsCheck, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const overlaps = (segs, rs, re) => segs.some(s => Math.max(rs, s.start) < Math.min(re, s.end));

const catSeat = sn => {
  const n = parseInt((sn||'').replace(/^S/i,''), 10);
  if (isNaN(n)) return { position:'Unknown', zone:'Unknown' };
  return { position: ((n-1)%4)===0||((n-1)%4)===3?'Window':'Aisle', zone: Math.floor((n-1)/4)<3?'Front':Math.floor((n-1)/4)<7?'Middle':'Back' };
};

const toCamel = r => Object.fromEntries(
  Object.entries(r).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])
);

const applyPeakHourPricing = (s) => {
  const d = new Date(s.departure_date);
  const day = d.getDay();
  let isPeakHour = false;
  if (day === 0 || day === 5) {
    isPeakHour = true;
  } else if (s.departure_time) {
    const [h, m] = s.departure_time.split(':').map(Number);
    const mins = h * 60 + m;
    if ((mins >= 360 && mins <= 540) || (mins >= 990 && mins <= 1170)) isPeakHour = true;
  }
  const base = Number(s.fare);
  return { baseFare: base, fare: isPeakHour ? Math.round(base * 1.15) : base, isPeakHour };
};

/* ----- Feature Constants ----- */
const DISCOUNT_CONFIG = { student: { label: 'Student', percentage: 10 }, senior: { label: 'Senior Citizen', percentage: 15 }, none: { label: 'None', percentage: 0 } };
const HOLD_DURATION_MS = 5 * 60 * 1000;

const calcDiscount = (type, amount) => {
  const cfg = DISCOUNT_CONFIG[type?.toLowerCase()] || DISCOUNT_CONFIG.none;
  const discount = Math.round(amount * cfg.percentage / 100);
  return { discountType: type || 'None', discountPercentage: cfg.percentage, discount, finalAmount: amount - discount };
};

const protect = async (req, res, next) => {
  const a = req.headers.authorization;
  if (!a || !a.startsWith('Bearer ')) return res.status(401).json({ message:'Not authorized, no token' });
  try {
    const d = jwt.verify(a.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [d.id]);
    if (!rows.length) return res.status(401).json({ message:'User not found' });
    req.user = rows[0]; next();
  } catch { return res.status(401).json({ message:'Not authorized, token failed' }); }
};
const admin = (req,res,next) => req.user?.role==='admin'?next():res.status(401).json({ message:'Not authorized as admin' });
const conductor = (req,res,next) => (req.user?.role==='conductor'||req.user?.role==='admin')?next():res.status(401).json({ message:'Not authorized as conductor' });

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name||!email||!password) return res.status(400).json({ message:'Please add all fields' });
    const { rows: ex } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (ex.length) return res.status(400).json({ message:'User already exists' });
    if (typeof email !== 'string') return res.status(400).json({ message:'Invalid email format' });
    const role = email.toLowerCase().endsWith('@smartbus.lk') ? 'conductor' : 'passenger';
    const h = await bcrypt.hash(password,10);
    const { rows: [u] } = await pool.query(
      'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role',
      [name,email,h,role]
    );
    const token = jwt.sign({ id:u.id }, process.env.JWT_SECRET, { expiresIn:'30d' });
    res.status(201).json({ _id:u.id, id:u.id, name:u.name, email:u.email, role:u.role, token });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length||!(await bcrypt.compare(password, rows[0].password))) return res.status(401).json({ message:'Invalid email or password' });
    const u = rows[0];
    const token = jwt.sign({ id:u.id }, process.env.JWT_SECRET, { expiresIn:'30d' });
    res.json({ _id:u.id, id:u.id, name:u.name, email:u.email, role:u.role, token });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/auth/conductors', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id,name,email,role FROM users WHERE role='conductor'");
    res.json(rows.map(r=>({...r,_id:r.id})));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/buses', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id, b.bus_number, b.capacity, b.type, b.photo, b.status, b.conductor_id,
        u.name AS c_name, u.email AS c_email
      FROM buses b LEFT JOIN users u ON b.conductor_id=u.id`);
    res.json(rows.map(b => {
      const bus = toCamel(b);
      return { ...bus, c_name:undefined, c_email:undefined, _id:bus.id,
        conductor: bus.conductorId ? { id:bus.conductorId, _id:bus.conductorId, name:bus.c_name, email:bus.c_email } : null
      };
    }));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/buses', protect, admin, async (req, res) => {
  try {
    const { busNumber,capacity,type,conductor,photo } = req.body;
    const { rows: [bus] } = await pool.query(
      'INSERT INTO buses (bus_number,capacity,type,conductor_id,photo) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [busNumber,capacity||40,type||'Standard',conductor||null,photo||'']
    );
    res.status(201).json({ ...toCamel(bus), _id:bus.id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.patch('/api/buses/:id', protect, admin, async (req, res) => {
  try {
    const { busNumber,capacity,type,conductor,photo,status } = req.body;
    const sets = [], params = [], cols = [];
    if (busNumber!==undefined) { sets.push('bus_number=$'+(sets.length+1)); params.push(busNumber); cols.push('busNumber'); }
    if (capacity!==undefined) { sets.push('capacity=$'+(sets.length+1)); params.push(capacity); cols.push('capacity'); }
    if (type!==undefined) { sets.push('type=$'+(sets.length+1)); params.push(type); cols.push('type'); }
    if (conductor!==undefined) { sets.push('conductor_id=$'+(sets.length+1)); params.push(conductor||null); cols.push('conductor'); }
    if (photo!==undefined) { sets.push('photo=$'+(sets.length+1)); params.push(photo); cols.push('photo'); }
    if (status!==undefined) { sets.push('status=$'+(sets.length+1)); params.push(status); cols.push('status'); }
    if (!sets.length) return res.status(400).json({ message:'No fields to update' });
    params.push(req.params.id);
    const sql = `UPDATE buses SET ${sets.join(',')} WHERE id=$${params.length} RETURNING *`;
    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ message:'Bus not found or was deleted' });
    res.json({ ...toCamel(rows[0]), _id:rows[0].id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.delete('/api/buses/:id', protect, admin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM buses WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message:'Bus not found' });
    res.json({ message:'Bus removed' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.patch('/api/buses/:id/status', protect, conductor, async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE buses SET status=$1 WHERE id=$2 RETURNING *', [req.body.status, req.params.id]);
    if (!rows.length) return res.status(404).json({ message:'Bus not found or was deleted' });
    res.json({ ...toCamel(rows[0]), _id:rows[0].id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/routes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM routes');
    res.json(rows.map(r => ({ ...toCamel(r), stops: r.stops || [], _id:r.id })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/routes/locations', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stops FROM routes');
    const set = new Set();
    rows.forEach(r => (r.stops||[]).forEach(s => set.add(s)));
    res.json([...set].sort());
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/routes', protect, admin, async (req, res) => {
  try {
    const { name,stops,distance,estimatedDuration } = req.body;
    const arr = typeof stops==='string' ? stops.split(',').map(s=>s.trim()).filter(Boolean) : (stops||[]);
    if (arr.length<2) return res.status(400).json({ message:'Provide at least 2 stops' });
    const { rows: [route] } = await pool.query(
      'INSERT INTO routes (name,stops,distance,estimated_duration) VALUES ($1,$2,$3,$4) RETURNING *',
      [name,JSON.stringify(arr),distance,estimatedDuration]
    );
    res.status(201).json({ ...toCamel(route), stops: route.stops || [], _id:route.id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.delete('/api/routes/:id', protect, admin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM routes WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message:'Route not found' });
    res.json({ message:'Route removed' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    const o = origin || undefined, d = destination || undefined;

    let routeIds = null;
    if (o || d) {
      const { rows: all } = await pool.query('SELECT id,stops FROM routes');
      const match = all.filter(r => {
        const st = r.stops || [];
        if (o && d) { const oi=st.indexOf(o), di=st.indexOf(d); return oi!==-1 && di!==-1 && oi<di; }
        return o ? st.includes(o) : st.includes(d);
      });
      if (!match.length) return res.json([]);
      routeIds = match.map(r => r.id);
    }

    let pIdx = 1;
    const clauses = [];
    const params = [];

    clauses.push("b.status='Active'");

    if (routeIds) {
      clauses.push(`s.route_id = ANY($${pIdx++}::int[])`);
      params.push(routeIds);
    }

    if (date) {
      const { rows: [{ todayStr, maxStr }] } = await pool.query(
        "SELECT CURRENT_DATE::text AS today_str, (CURRENT_DATE + INTERVAL '6 days')::text AS max_str"
      );
      if (date < todayStr) return res.json([]);
      if (date > maxStr) return res.json([]);
      clauses.push(`s.departure_date = $${pIdx++}::date`);
      params.push(date);
      if (date === todayStr) clauses.push(`s.departure_time >= LOCALTIME`);
    } else {
      clauses.push(`s.departure_date = CURRENT_DATE`);
      clauses.push(`s.departure_time >= LOCALTIME`);
    }

    const sql = `SELECT s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
      b.bus_number, b.type AS bus_type, b.status AS bus_status, b.conductor_id AS bus_conductor_id,
      r.name AS route_name, r.stops AS route_stops
      FROM schedules s JOIN buses b ON s.bus_id=b.id JOIN routes r ON s.route_id=r.id
      WHERE ${clauses.join(' AND ')} ORDER BY s.departure_date, s.departure_time`;

    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.json([]);

    const ids = rows.map(s => s.id);
    pIdx = 1;
    const seatPH = ids.map(() => `$${pIdx++}`);
    const { rows: allSeats } = await pool.query(
      `SELECT id, schedule_id, seat_number, is_broken, booked_segments, booked_by_id FROM seats WHERE schedule_id IN (${seatPH.join(',')})`,
      ids
    );
    const sMap = {};
    allSeats.forEach(st => { if(!sMap[st.schedule_id]) sMap[st.schedule_id]=[]; sMap[st.schedule_id].push(st); });

    /* batch fetch delay alerts */
    const { rows: delays } = await pool.query(
      `SELECT schedule_id, delay_minutes, reason FROM delay_alerts WHERE schedule_id = ANY($1::int[]) AND is_active=true`,
      [ids]
    );
    const delayMap = {};
    delays.forEach(d => { delayMap[d.schedule_id] = { delayMinutes: d.delay_minutes, reason: d.reason }; });

    const result = rows.map(s => {
      const stops = s.route_stops || [];
      const oi = o ? stops.indexOf(o) : -1;
      const dj = d ? stops.indexOf(d) : -1;
      const seats = (sMap[s.id]||[]).map(st => {
        const segs = st.booked_segments || [];
        let isBooked = false;
        if (segs.length && oi!==-1 && dj!==-1) isBooked = overlaps(segs, oi, dj);
        return { id:st.id, _id:st.id, schedule_id:st.schedule_id, seat_number:st.seat_number,
          is_broken:st.is_broken, booked_segments:segs, booked_by_id:st.booked_by_id,
          seatNumber:st.seat_number, isBroken:st.is_broken, bookedSegments:segs };
      });
      const dl = delayMap[s.id];
      return {
        id:s.id, _id:s.id, bus_id:s.bus_id, route_id:s.route_id,
        departureDate:s.departure_date, departureTime:s.departure_time, ...applyPeakHourPricing(s),
        stops, seats,
        searchedOrigin: o || null, searchedDestination: d || null,
        delayInfo: dl || null,
        route: { id:s.route_id, _id:s.route_id, name:s.route_name, stops },
        bus: { id:s.bus_id, _id:s.bus_id, busNumber:s.bus_number, type:s.bus_type, status:s.bus_status, conductor:s.bus_conductor_id }
      };
    });
    res.json(result);
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/schedules', protect, admin, async (req, res) => {
  try {
    const { bus,route,departureDate,departureTime,fare } = req.body;
    const { rows: [b] } = await pool.query('SELECT id,capacity,status,bus_number FROM buses WHERE id=$1', [bus]);
    if (!b) return res.status(404).json({ message:'Bus not found' });
    if (b.status==='Broken') return res.status(400).json({ message:'Cannot create schedule for a broken bus' });
    /* check if bus has active maintenance */
    const { rows: mnt } = await pool.query(
      "SELECT id FROM maintenance_records WHERE bus_id=$1 AND status IN ('Scheduled','In Progress') LIMIT 1", [bus]
    );
    if (mnt.length) return res.status(400).json({ message:'Bus is under maintenance — cannot create schedule' });
    const { rows: [s] } = await pool.query(
      'INSERT INTO schedules (bus_id,route_id,departure_date,departure_time,fare) VALUES ($1,$2,$3,$4::time,$5) RETURNING id',
      [bus,route,departureDate,departureTime,fare]
    );
    const sid = s.id;
    const seatValues = [];
    for (let i = 1; i <= b.capacity; i++) { seatValues.push(sid, `S${i}`); }
    let sp = 1;
    const sPH = [];
    for (let i = 1; i <= b.capacity; i++) { sPH.push(`($${sp++}, $${sp++})`); }
    await pool.query(`INSERT INTO seats (schedule_id,seat_number) VALUES ${sPH.join(',')}`, seatValues);

    const { rows: [sched] } = await pool.query(
      `SELECT s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        b.bus_number, b.type, b.status
       FROM schedules s JOIN buses b ON s.bus_id=b.id WHERE s.id=$1`, [sid]
    );
    res.status(201).json({ ...toCamel(sched), _id:sched.id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/schedules/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        b.bus_number, b.type AS bus_type, b.status AS bus_status, b.conductor_id AS bus_conductor_id,
        r.name AS route_name, r.stops AS route_stops
       FROM schedules s JOIN buses b ON s.bus_id=b.id JOIN routes r ON s.route_id=r.id WHERE s.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message:'Schedule not found' });
    const s = rows[0];
    const stops = s.route_stops || [];
    const { rows: seatRows } = await pool.query(
      'SELECT id, schedule_id, seat_number, is_broken, booked_segments, booked_by_id FROM seats WHERE schedule_id=$1',
      [s.id]
    );
    const { origin,destination } = req.query;
    const ri = origin?stops.indexOf(origin):-1, rj = destination?stops.indexOf(destination):-1;
    const seats = seatRows.map(st => {
      const segs = st.booked_segments || [];
      let isBooked = false;
      if (segs.length && ri!==-1 && rj!==-1) isBooked = overlaps(segs, ri, rj);
      return { id:st.id, _id:st.id, seatNumber:st.seat_number, isBroken:st.is_broken, bookedSegments:segs, schedule_id:st.schedule_id,
        isBooked, seat_number:st.seat_number, is_broken:st.is_broken, booked_segments:segs, booked_by_id:st.booked_by_id };
    });
    const { rows: delayRows } = await pool.query(
      'SELECT delay_minutes, reason FROM delay_alerts WHERE schedule_id=$1 AND is_active=true LIMIT 1', [s.id]
    );
    res.json({
      id:s.id, _id:s.id, departureDate:s.departure_date, departureTime:s.departure_time, ...applyPeakHourPricing(s),
      stops, seats,
      delayInfo: delayRows.length ? { delayMinutes: delayRows[0].delay_minutes, reason: delayRows[0].reason } : null,
      route: { id:s.route_id, _id:s.route_id, name:s.route_name, stops },
      bus: { id:s.bus_id, _id:s.bus_id, busNumber:s.bus_number, type:s.bus_type, status:s.bus_status, conductor:s.bus_conductor_id }
    });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/schedules/:id/seats', async (req, res) => {
  try {
    const { rows: [s] } = await pool.query(
      'SELECT r.stops FROM schedules s JOIN routes r ON s.route_id=r.id WHERE s.id=$1',
      [req.params.id]
    );
    if (!s) return res.status(404).json({ message:'Schedule not found' });
    const stops = s.stops || [];
    const { rows } = await pool.query(
      'SELECT id, schedule_id, seat_number, is_broken, booked_segments, booked_by_id FROM seats WHERE schedule_id=$1',
      [req.params.id]
    );
    res.json(rows.map(x => {
      const segs = x.booked_segments || [];
      const isBooked = segs.length && stops.length>1 ? overlaps(segs,0,stops.length-1) : !!segs.length;
      return { id:x.id, _id:x.id, seatNumber:x.seat_number, isBroken:x.is_broken, bookedSegments:segs, schedule_id:x.schedule_id, isBooked,
        seat_number:x.seat_number, is_broken:x.is_broken, booked_segments:segs, booked_by_id:x.booked_by_id };
    }));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.patch('/api/schedules/:id/seats/:seatId/toggle', protect, conductor, async (req, res) => {
  try {
    const { rows: [seat] } = await pool.query(
      'SELECT * FROM seats WHERE id=$1 AND schedule_id=$2',
      [req.params.seatId, req.params.id]
    );
    if (!seat) return res.status(404).json({ message:'Seat not found' });
    const segs = seat.booked_segments || [];
    if (!segs.length && !seat.is_broken) {
      const { rows: [s] } = await pool.query(
        'SELECT r.stops FROM schedules s JOIN routes r ON s.route_id=r.id WHERE s.id=$1',
        [req.params.id]
      );
      const stops = s ? (s.stops || []) : [];
      if (stops.length) {
        await pool.query(
          'UPDATE seats SET booked_segments=$1, is_broken=false, booked_by_id=$2 WHERE id=$3',
          [JSON.stringify([{start:0, end:stops.length-1, startStop:stops[0], endStop:stops[stops.length-1]}]), req.user.id, req.params.seatId]
        );
      }
    } else if (segs.length) {
      await pool.query(
        'UPDATE seats SET booked_segments=$1, is_broken=true, booked_by_id=NULL WHERE id=$2',
        [JSON.stringify([]), req.params.seatId]
      );
    } else if (seat.is_broken) {
      await pool.query(
        'UPDATE seats SET booked_segments=$1, is_broken=false WHERE id=$2',
        [JSON.stringify([]), req.params.seatId]
      );
    }
    const { rows: [u] } = await pool.query('SELECT * FROM seats WHERE id=$1', [req.params.seatId]);
    if (!u) return res.status(404).json({ message:'Seat not found after update' });
    try { req.io.emit('seatUpdated', { scheduleId: Number(req.params.id), seatId: Number(req.params.seatId) }); } catch(e) {}
    res.json({ message:'Seat status updated', seat: { ...toCamel(u), _id:u.id } });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/bookings', protect, async (req, res) => {
  try {
    const { scheduleId, seatsToBook, startStop, endStop, discountType, emergencyName, emergencyRelationship, emergencyPhone } = req.body;
    if (!Array.isArray(seatsToBook) || seatsToBook.length === 0) return res.status(400).json({ message:'Select at least one seat' });
    const { rows: [sched] } = await pool.query(
      `SELECT s.id, s.fare, s.bus_id, s.departure_date, s.departure_time,
        r.stops AS route_stops, r.name AS route_name
       FROM schedules s JOIN routes r ON s.route_id=r.id WHERE s.id=$1`,
      [scheduleId]
    );
    if (!sched) return res.status(404).json({ message:'Schedule not found' });
    if (!startStop||!endStop) return res.status(400).json({ message:'Start and end stops must be provided' });
    const stops = sched.route_stops || [];
    const si = stops.indexOf(startStop), ei = stops.indexOf(endStop);
    if (si===-1||ei===-1||si>=ei) return res.status(400).json({ message:'Invalid segment requested' });

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      const { rows: allSeats } = await conn.query('SELECT * FROM seats WHERE schedule_id=$1 FOR UPDATE', [scheduleId]);
      const toUpdate = [];
      for (const seat of allSeats) {
        if (seatsToBook.includes(seat.seat_number)) {
          if (seat.is_broken) { await conn.query('ROLLBACK'); conn.release(); return res.status(400).json({ message:'One or more selected seats are unavailable' }); }
          if (overlaps(seat.booked_segments || [], si, ei)) { await conn.query('ROLLBACK'); conn.release(); return res.status(400).json({ message:'One or more selected seats are already booked for this segment' }); }
          toUpdate.push(seat);
        }
      }
      if (toUpdate.length !== seatsToBook.length) { await conn.query('ROLLBACK'); conn.release(); return res.status(400).json({ message:'Invalid seat selection' }); }

      for (const seat of toUpdate) {
        const segs = seat.booked_segments || [];
        segs.push({ start:si, end:ei, startStop, endStop });
        await conn.query('UPDATE seats SET booked_segments=$1, booked_by_id=$2 WHERE id=$3', [JSON.stringify(segs), req.user.id, seat.id]);
      }

      const fare = sched.fare;
      const rawTotal = (fare && !isNaN(Number(fare)) ? Number(fare) : 0) * seatsToBook.length;
      const disc = calcDiscount(discountType, rawTotal);
      const { rows: [bk] } = await conn.query(
        `INSERT INTO bookings (passenger_id,schedule_id,seats_booked,total_fare,discount_type,discount_percentage,start_stop,end_stop,status,
          emergency_name,emergency_relationship,emergency_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Confirmed',$9,$10,$11) RETURNING id`,
        [req.user.id, scheduleId, JSON.stringify(seatsToBook), disc.finalAmount, disc.discountType, disc.discountPercentage, startStop, endStop,
          emergencyName||'', emergencyRelationship||'', emergencyPhone||'']
      );

      /* release any held seats for this user on this schedule */
      await conn.query('DELETE FROM seat_holds WHERE schedule_id=$1 AND user_id=$2', [scheduleId, req.user.id]);

      await conn.query('COMMIT');
      conn.release();

      try {
        const { rows: [pass] } = await pool.query('SELECT name,email FROM users WHERE id=$1', [req.user.id]);
        const { rows: [bus] } = await pool.query('SELECT bus_number FROM buses WHERE id=$1', [sched.bus_id]);
        req.io.emit('newBookingAlert', {
          message:`New booking from ${pass?.name||'A passenger'} for Bus ${bus?.bus_number||sched.bus_id}!`,
          booking:{ passenger:pass||{email:req.user.email}, busNumber:bus?.bus_number, routeName:sched.route_name,
            seats:seatsToBook, totalFare, startStop, endStop, time:new Date().toISOString() }
        });
        /* notify all clients that held seats are now booked */
        seatsToBook.forEach(sn => {
          req.io.emit('seatReleased', { scheduleId, seatNumber: sn });
        });
      } catch(e) { console.error('Socket emit error:', e.message); }

      const { rows: [b] } = await pool.query(
        `SELECT b.id, b.passenger_id, b.schedule_id, b.seats_booked, b.total_fare, b.start_stop, b.end_stop,
          b.status, b.payment_status, b.booking_date, b.created_at, b.discount_type, b.discount_percentage,
          b.emergency_name, b.emergency_relationship, b.emergency_phone,
          u.name AS pn, u.email AS pe
         FROM bookings b LEFT JOIN users u ON b.passenger_id=u.id WHERE b.id=$1`,
        [bk.id]
      );
      if (!b) return res.status(500).json({ message:'Booking created but retrieval failed' });
      res.status(201).json({
        id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
        seatsBooked:b.seats_booked || [], totalFare:Number(b.total_fare), startStop:b.start_stop, endStop:b.end_stop,
        status:b.status, paymentStatus:b.payment_status, bookingDate:b.booking_date,
        discountType:b.discount_type, discountPercentage:Number(b.discount_percentage),
        emergencyName:b.emergency_name, emergencyRelationship:b.emergency_relationship, emergencyPhone:b.emergency_phone,
        passenger: b.passenger_id ? { id:b.passenger_id, _id:b.passenger_id, name:b.pn, email:b.pe } : null
      });
    } catch(e) {
      try { await conn.query('ROLLBACK'); } catch {}
      conn.release();
      return res.status(500).json({ message:e.message });
    }
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/bookings', protect, admin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.passenger_id, b.schedule_id, b.seats_booked, b.total_fare, b.start_stop, b.end_stop,
        b.status, b.payment_status, b.booking_date, b.created_at,
        b.discount_type, b.discount_percentage,
        b.emergency_name, b.emergency_relationship, b.emergency_phone,
        u.name AS pn, u.email AS pe,
        s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        bu.bus_number, r.name AS route_name
       FROM bookings b LEFT JOIN users u ON b.passenger_id=u.id
       LEFT JOIN schedules s ON b.schedule_id=s.id
       LEFT JOIN buses bu ON s.bus_id=bu.id
       LEFT JOIN routes r ON s.route_id=r.id
       ORDER BY b.created_at DESC`
    );
    /* batch-fetch delay alerts */
    const schedIds = rows.map(b => b.schedule_id).filter(Boolean);
    let delayMap = {};
    if (schedIds.length) {
      const { rows: dRows } = await pool.query(
        'SELECT schedule_id, delay_minutes, reason, updated_at FROM delay_alerts WHERE schedule_id = ANY($1::int[]) AND is_active=true',
        [[...new Set(schedIds)]]
      );
      dRows.forEach(d => { delayMap[d.schedule_id] = { delayMinutes: d.delay_minutes, reason: d.reason, updatedAt: d.updated_at }; });
    }
    res.json(rows.map(b => {
      const dl = b.schedule_id ? delayMap[b.schedule_id] : null;
      let newDepartureTime = null;
      if (dl) {
        const [h, m] = b.departure_time.split(':').map(Number);
        const totalMin = h * 60 + m + Number(dl.delayMinutes);
        const newH = Math.floor(totalMin / 60) % 24;
        const newM = totalMin % 60;
        newDepartureTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
      return {
        id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
        seatsBooked:b.seats_booked || [], totalFare:b.total_fare ? Number(b.total_fare) : 0,
        startStop:b.start_stop, endStop:b.end_stop, status:b.status, paymentStatus:b.payment_status,
        bookingDate:b.booking_date, createdAt:b.created_at,
        discountType:b.discount_type, discountPercentage:b.discount_percentage ? Number(b.discount_percentage) : 0,
        emergencyName:b.emergency_name, emergencyRelationship:b.emergency_relationship, emergencyPhone:b.emergency_phone,
        delayInfo: dl ? { ...dl, originalDepartureTime: b.departure_time, newDepartureTime } : null,
        passenger: b.passenger_id ? { id:b.passenger_id, _id:b.passenger_id, name:b.pn, email:b.pe } : null,
        schedule: b.schedule_id ? {
          id:b.schedule_id, _id:b.schedule_id, departureDate:b.departure_date, departureTime:b.departure_time, fare:b.fare ? Number(b.fare) : 0,
          bus: { id:b.bus_id, _id:b.bus_id, busNumber:b.bus_number },
          route: { id:b.route_id, _id:b.route_id, name:b.route_name }
        } : null
      };
    }));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/bookings/mybookings', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.passenger_id, b.schedule_id, b.seats_booked, b.total_fare, b.start_stop, b.end_stop,
        b.status, b.payment_status, b.booking_date, b.created_at,
        b.discount_type, b.discount_percentage,
        b.emergency_name, b.emergency_relationship, b.emergency_phone,
        s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        bu.bus_number, r.name AS route_name, r.stops AS route_stops
       FROM bookings b LEFT JOIN schedules s ON b.schedule_id=s.id
       LEFT JOIN buses bu ON s.bus_id=bu.id
       LEFT JOIN routes r ON s.route_id=r.id
       WHERE b.passenger_id=$1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    /* batch-fetch delay alerts for all returned schedule IDs */
    const schedIds = rows.map(b => b.schedule_id).filter(Boolean);
    let delayMap = {};
    if (schedIds.length) {
      const { rows: dRows } = await pool.query(
        'SELECT schedule_id, delay_minutes, reason, updated_at FROM delay_alerts WHERE schedule_id = ANY($1::int[]) AND is_active=true',
        [[...new Set(schedIds)]]
      );
      dRows.forEach(d => {
        delayMap[d.schedule_id] = { delayMinutes: d.delay_minutes, reason: d.reason, updatedAt: d.updated_at };
      });
    }

    res.json(rows.map(b => {
      const dl = b.schedule_id ? delayMap[b.schedule_id] : null;
      let newDepartureTime = null;
      if (dl) {
        const [h, m] = b.departure_time.split(':').map(Number);
        const totalMin = h * 60 + m + Number(dl.delayMinutes);
        const newH = Math.floor(totalMin / 60) % 24;
        const newM = totalMin % 60;
        newDepartureTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
      return {
        id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
        seatsBooked:b.seats_booked || [], totalFare:b.total_fare ? Number(b.total_fare) : 0,
        startStop:b.start_stop, endStop:b.end_stop, status:b.status, paymentStatus:b.payment_status,
        bookingDate:b.booking_date, createdAt:b.created_at,
        discountType:b.discount_type, discountPercentage:b.discount_percentage ? Number(b.discount_percentage) : 0,
        emergencyName:b.emergency_name, emergencyRelationship:b.emergency_relationship, emergencyPhone:b.emergency_phone,
        delayInfo: dl ? { ...dl, originalDepartureTime: b.departure_time, newDepartureTime } : null,
        schedule: b.schedule_id ? {
          id:b.schedule_id, _id:b.schedule_id, departureDate:b.departure_date, departureTime:b.departure_time, fare:b.fare ? Number(b.fare) : 0,
          bus: { id:b.bus_id, _id:b.bus_id, busNumber:b.bus_number },
          route: { id:b.route_id, _id:b.route_id, name:b.route_name, stops: (b.route_stops || []).map(s => s) }
        } : null
      };
    }));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/analytics/booking-trends', protect, admin, async (req, res) => {
  try {
    const { rows: hourly } = await pool.query(
      "SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count FROM bookings WHERE status='Confirmed' GROUP BY hour ORDER BY hour"
    );
    const hMap = {};
    hourly.forEach(h => { hMap[Number(h.hour)] = Number(h.count); });
    const hFull = Array.from({length:24}, (_,i) => ({
      hour:i, label:i<12 ? `${i||12} AM` : `${i===12?12:i-12} PM`, count:hMap[i]||0
    }));

    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const { rows: weekly } = await pool.query(
      "SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*)::int AS count FROM bookings WHERE status='Confirmed' GROUP BY dow ORDER BY dow"
    );
    const wMap = {};
    weekly.forEach(d => { wMap[Number(d.dow)] = Number(d.count); });
    const wFull = days.map((n,i) => ({ dow:i, day:n, count:wMap[i]||0 }));

    const { rows: rPop } = await pool.query(
      `SELECT r.id AS route_id, r.name AS route_name, COUNT(*)::int AS count
       FROM bookings b JOIN schedules s ON b.schedule_id=s.id JOIN routes r ON s.route_id=r.id
       WHERE b.status='Confirmed' GROUP BY r.id,r.name ORDER BY count DESC`
    );
    res.json({ hourly:hFull, weekly:wFull, routePopularity:rPop });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/analytics/seat-preferences', protect, admin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT seats_booked FROM bookings WHERE status='Confirmed' LIMIT 10000");
    let total=0;
    const pos={Window:0,Aisle:0,Unknown:0}, zone={Front:0,Middle:0,Back:0,Unknown:0}, sPop={};
    rows.forEach(b => {
      const seats = b.seats_booked || [];
      seats.forEach(sn => {
        total++;
        const p = catSeat(sn);
        pos[p.position] = (pos[p.position]||0)+1;
        zone[p.zone] = (zone[p.zone]||0)+1;
        sPop[sn] = (sPop[sn]||0)+1;
      });
    });
    const pct = obj => { const p={}; Object.keys(obj).forEach(k=>{p[k]=total?Math.round(obj[k]/total*100):0;}); return p; };
    res.json({
      totalBookings:total,
      position:{labels:Object.keys(pos),values:Object.values(pos),percent:pct(pos)},
      zone:{labels:Object.keys(zone),values:Object.values(zone),percent:pct(zone)},
      seatRanking:Object.entries(sPop).map(([k,v])=>({seatNumber:k,count:v,...catSeat(k)})).sort((a,b)=>b.count-a.count).slice(0,20)
    });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/analytics/generate-demo', protect, admin, async (req, res) => {
  try {
    await pool.query('DELETE FROM bookings');
    const { rows: sched } = await pool.query(
      `SELECT s.id, s.fare, s.bus_id, r.stops AS route_stops, r.name AS route_name
       FROM schedules s JOIN routes r ON s.route_id=r.id ORDER BY RANDOM() LIMIT 30`
    );
    if (!sched.length) return res.status(400).json({ message:'No schedules found. Add schedules via the admin panel first.' });

    let { rows: pass } = await pool.query("SELECT id FROM users WHERE role='passenger'");
    if (!pass.length) {
      const hp = await bcrypt.hash('password123',10);
      for (const n of ['Alice','Bob','Charlie','Diana','Eve']) {
        await pool.query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)', [n,`${n.toLowerCase()}@test.com`,hp,'passenger']);
      }
      const { rows: r } = await pool.query("SELECT id FROM users WHERE role='passenger'");
      pass = r;
    }

    const sets = [['S1','S2'],['S4','S5'],['S8'],['S12','S13','S14'],['S3'],['S7','S8'],['S10'],['S15','S16'],['S20','S21','S22'],['S25'],['S30','S31'],['S35'],['S2','S3','S4'],['S6'],['S9','S10'],['S18','S19'],['S11'],['S14','S15'],['S17'],['S23','S24'],['S27','S28'],['S33'],['S36','S37'],['S39','S40']];
    const hrs = [6,6,7,7,7,8,8,8,8,9,9,9,9,9,10,10,10,11,11,12,12,13,13,14,14,14,15,15,15,16,16,16,16,17,17,17,17,17,18,18,18,18,19,19,19,20,20,21,22];
    const dw = [5,3,3,3,3,5,4];
    const now = new Date();
    const total = 1500 + Math.floor(Math.random() * 501);

    const bookCols = ['passenger_id','schedule_id','seats_booked','total_fare','status','payment_status','start_stop','end_stop','created_at','updated_at'];
    let batchCount = 0;

    for (let i = 0; i < total; i++) {
      const s = sched[i % sched.length];
      const stops = s.route_stops || [];
      const si = Math.floor(Math.random() * Math.max(stops.length - 1, 1));
      const ei = si + 1 + Math.floor(Math.random() * Math.max(stops.length - 1 - si, 1));
      const seats = sets[i % sets.length];
      const p = pass[i % pass.length];
      const d = new Date(now);
      d.setDate(d.getDate() - Math.floor(Math.random() * 30));
      d.setHours(hrs[i % hrs.length], Math.floor(Math.random() * 60), 0, 0);
      if (Math.random() * 5 > dw[d.getDay()]) d.setDate(d.getDate() - 1);
      const iso = d.toISOString().slice(0, 19).replace('T', ' ');

      const fare = s.fare ? Number(s.fare) : 0;
      const totalFare = fare * seats.length;

      await pool.query(
        `INSERT INTO bookings (${bookCols.join(',')}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p.id, s.id, JSON.stringify(seats), totalFare, 'Confirmed', 'Paid',
         stops[Math.min(si, stops.length - 1)] || 'Unknown', stops[Math.min(ei, stops.length - 1)] || 'Unknown', iso, iso]
      );
      batchCount++;
    }

    res.json({ message:`Generated ${batchCount} demo bookings`, count:batchCount });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/conductor/schedules', protect, conductor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        b.bus_number, b.type AS bus_type, b.status AS bus_status, b.conductor_id AS bus_conductor_id,
        r.name AS route_name, r.stops AS route_stops
       FROM schedules s JOIN buses b ON s.bus_id=b.id JOIN routes r ON s.route_id=r.id
       WHERE b.conductor_id=$1 AND s.departure_date=CURRENT_DATE
       ORDER BY s.departure_time LIMIT 3`,
      [req.user.id]
    );
    const ids = rows.map(s => s.id);
    let allSeats = [];
    if (ids.length) {
      let sp = 1;
      const ph = ids.map(() => `$${sp++}`);
      const { rows: r } = await pool.query(
        `SELECT id, schedule_id, seat_number, is_broken, booked_segments, booked_by_id FROM seats WHERE schedule_id IN (${ph.join(',')})`,
        ids
      );
      allSeats = r;
    }
    const sm = {};
    allSeats.forEach(st => { if(!sm[st.schedule_id]) sm[st.schedule_id]=[]; sm[st.schedule_id].push(st); });

    /* fetch delay info for conductor schedules */
    let delayMap = {};
    if (ids.length) {
      const { rows: dRows } = await pool.query(
        'SELECT schedule_id, delay_minutes, reason FROM delay_alerts WHERE schedule_id = ANY($1::int[]) AND is_active=true',
        [ids]
      );
      dRows.forEach(d => { delayMap[d.schedule_id] = { delayMinutes: d.delay_minutes, reason: d.reason }; });
    }

    res.json(rows.map(s => {
      const stops = s.route_stops || [];
      const seats = (sm[s.id]||[]).map(st => ({
        id:st.id, _id:st.id, seatNumber:st.seat_number, isBroken:st.is_broken,
        bookedSegments:st.booked_segments || [], isBooked:(st.booked_segments||[]).length > 0
      }));
      return {
        id:s.id, _id:s.id, bus_id:s.bus_id, route_id:s.route_id,
        departureDate:s.departure_date, departureTime:s.departure_time, fare:s.fare,
        ...applyPeakHourPricing(s),
        stops, seats,
        delayInfo: delayMap[s.id] || null,
        bus: { id:s.bus_id, _id:s.bus_id, busNumber:s.bus_number, type:s.bus_type, status:s.bus_status, conductor:s.bus_conductor_id },
        route: { id:s.route_id, _id:s.route_id, name:s.route_name, stops }
      };
    }));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

/* -------------------------------------------------------
   Seat Hold Timer (Feature 1)
   ------------------------------------------------------- */
app.post('/api/seats/hold', protect, async (req, res) => {
  try {
    const { scheduleId, seatNumber } = req.body;
    if (!scheduleId || !seatNumber) return res.status(400).json({ message:'scheduleId and seatNumber required' });
    const { rows: existing } = await pool.query(
      'SELECT id, user_id FROM seat_holds WHERE schedule_id=$1 AND seat_number=$2 AND expires_at > NOW()',
      [scheduleId, seatNumber]
    );
    if (existing.length > 0) {
      if (existing[0].user_id !== req.user.id) return res.status(409).json({ message:'Seat already held by another user' });
      /* refresh the hold for the same user */
      await pool.query('UPDATE seat_holds SET expires_at = NOW() + $1::interval WHERE id=$2', [HOLD_DURATION_MS + 'ms', existing[0].id]);
    } else {
      const { rows: [seat] } = await pool.query('SELECT id FROM seats WHERE schedule_id=$1 AND seat_number=$2', [scheduleId, seatNumber]);
      if (!seat) return res.status(404).json({ message:'Seat not found' });
      await pool.query(
        'INSERT INTO seat_holds (schedule_id, seat_number, user_id, expires_at) VALUES ($1, $2, $3, NOW() + $4::interval) ON CONFLICT DO NOTHING',
        [scheduleId, seatNumber, req.user.id, HOLD_DURATION_MS + 'ms']
      );
    }
    try { req.io.emit('seatHeld', { scheduleId, seatNumber, userId: req.user.id, expiresAt: Date.now() + HOLD_DURATION_MS }); } catch(e) {}
    res.json({ message:'Seat held', expiresInMs: HOLD_DURATION_MS });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.delete('/api/seats/hold', protect, async (req, res) => {
  try {
    const { scheduleId, seatNumber } = req.body;
    if (!scheduleId || !seatNumber) return res.status(400).json({ message:'scheduleId and seatNumber required' });
    const { rowCount } = await pool.query(
      'DELETE FROM seat_holds WHERE schedule_id=$1 AND seat_number=$2 AND user_id=$3',
      [scheduleId, seatNumber, req.user.id]
    );
    if (rowCount > 0) try { req.io.emit('seatReleased', { scheduleId, seatNumber }); } catch(e) {}
    res.json({ message:'Seat released' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/schedules/:id/holds', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT seat_number, user_id, expires_at FROM seat_holds WHERE schedule_id=$1 AND expires_at > NOW()',
      [req.params.id]
    );
    res.json(rows.map(r => ({ seatNumber: r.seat_number, userId: r.user_id, expiresAt: r.expires_at })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

/* -------------------------------------------------------
   Bus Delay Alerts (Feature 3)
   ------------------------------------------------------- */
app.post('/api/schedules/:id/delay', protect, conductor, async (req, res) => {
  try {
    const { delayMinutes, reason } = req.body;
    if (delayMinutes == null) return res.status(400).json({ message:'delayMinutes required' });

    /* fetch schedule + bus info for the notification */
    const { rows: [schedInfo] } = await pool.query(
      `SELECT s.departure_time, s.departure_date, b.bus_number, r.name AS route_name
       FROM schedules s JOIN buses b ON s.bus_id=b.id JOIN routes r ON s.route_id=r.id WHERE s.id=$1`,
      [req.params.id]
    );
    if (!schedInfo) return res.status(404).json({ message:'Schedule not found' });

    const sid = Number(req.params.id);
    const now = new Date();

    if (delayMinutes <= 0) {
      /* clear delay */
      await pool.query("UPDATE delay_alerts SET is_active=false, updated_at=NOW() WHERE schedule_id=$1 AND is_active=true", [sid]);
      const payload = {
        scheduleId: sid, delayMinutes: 0, reason: '', isActive: false,
        departureTime: schedInfo.departure_time,
        busNumber: schedInfo.bus_number, routeName: schedInfo.route_name,
        originalDepartureTime: schedInfo.departure_time,
        newDepartureTime: schedInfo.departure_time,
        updatedAt: now.toISOString()
      };
      try {
        req.io.to(`schedule_${sid}`).emit('delayNotification', payload);
        /* also broadcast the generic update for non-passenger views */
        req.io.emit('delayUpdated', { scheduleId: sid, delayMinutes: 0, reason: '', isActive: false });
      } catch(e) {}
      return res.json({ message:'Delay cleared' });
    }

    /* upsert active delay */
    const { rows: [existing] } = await pool.query('SELECT id FROM delay_alerts WHERE schedule_id=$1 AND is_active=true', [sid]);
    if (existing) {
      await pool.query('UPDATE delay_alerts SET delay_minutes=$1, reason=$2, updated_at=NOW() WHERE id=$3', [delayMinutes, reason||'', existing.id]);
    } else {
      await pool.query('INSERT INTO delay_alerts (schedule_id, delay_minutes, reason) VALUES ($1, $2, $3)', [sid, delayMinutes, reason||'']);
    }

    /* compute new departure time */
    const [h, m] = schedInfo.departure_time.split(':').map(Number);
    const totalMin = h * 60 + m + Number(delayMinutes);
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    const newDepartureTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;

    const payload = {
      scheduleId: sid, delayMinutes: Number(delayMinutes), reason: reason||'', isActive: true,
      departureTime: schedInfo.departure_time,
      busNumber: schedInfo.bus_number, routeName: schedInfo.route_name,
      originalDepartureTime: schedInfo.departure_time,
      newDepartureTime,
      updatedAt: now.toISOString()
    };

    try {
      /* emit to room — only passengers who booked this schedule receive this */
      req.io.to(`schedule_${sid}`).emit('delayNotification', payload);
      /* also broadcast generic update for conductor/admin dashboards */
      req.io.emit('delayUpdated', { scheduleId: sid, delayMinutes: Number(delayMinutes), reason: reason||'', isActive: true });
    } catch(e) {}

    res.json({ message:'Delay reported', delayMinutes: Number(delayMinutes), reason: reason||'' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/delays', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.schedule_id, d.delay_minutes, d.reason, d.created_at, d.updated_at,
        s.departure_date, s.departure_time,
        b.bus_number, r.name AS route_name
       FROM delay_alerts d JOIN schedules s ON d.schedule_id=s.id
       JOIN buses b ON s.bus_id=b.id
       JOIN routes r ON s.route_id=r.id
       WHERE d.is_active=true ORDER BY d.created_at DESC`
    );
    res.json(rows.map(r => ({
      id: r.id, _id: r.id, scheduleId: r.schedule_id, delayMinutes: r.delay_minutes, reason: r.reason,
      departureDate: r.departure_date, departureTime: r.departure_time, busNumber: r.bus_number, routeName: r.route_name
    })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

/* -------------------------------------------------------
   Bus Maintenance Module (Feature 4)
   ------------------------------------------------------- */
app.get('/api/maintenance', protect, admin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, b.bus_number FROM maintenance_records m JOIN buses b ON m.bus_id=b.id ORDER BY m.service_date DESC`
    );
    res.json(rows.map(r => ({ ...toCamel(r), _id: r.id, busNumber: r.bus_number })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/maintenance', protect, admin, async (req, res) => {
  try {
    const { busId, maintenanceType, description, serviceDate, expectedCompletionDate, cost, mechanic, status } = req.body;
    if (!busId || !serviceDate) return res.status(400).json({ message:'busId and serviceDate required' });
    const { rows: [r] } = await pool.query(
      `INSERT INTO maintenance_records (bus_id,maintenance_type,description,service_date,expected_completion_date,cost,mechanic,status)
       VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8) RETURNING *`,
      [busId, maintenanceType||'', description||'', serviceDate, expectedCompletionDate||serviceDate, cost||0, mechanic||'', status||'Scheduled']
    );
    res.status(201).json({ ...toCamel(r), _id: r.id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.put('/api/maintenance/:id', protect, admin, async (req, res) => {
  try {
    const { maintenanceType, description, serviceDate, expectedCompletionDate, cost, mechanic, status } = req.body;
    const sets = [], params = [];
    if (maintenanceType !== undefined) { sets.push('maintenance_type=$'+(sets.length+1)); params.push(maintenanceType); }
    if (description !== undefined) { sets.push('description=$'+(sets.length+1)); params.push(description); }
    if (serviceDate !== undefined) { sets.push('service_date=$'+(sets.length+1)+'::date'); params.push(serviceDate); }
    if (expectedCompletionDate !== undefined) { sets.push('expected_completion_date=$'+(sets.length+1)+'::date'); params.push(expectedCompletionDate); }
    if (cost !== undefined) { sets.push('cost=$'+(sets.length+1)); params.push(cost); }
    if (mechanic !== undefined) { sets.push('mechanic=$'+(sets.length+1)); params.push(mechanic); }
    if (status !== undefined) { sets.push('status=$'+(sets.length+1)); params.push(status); }
    if (!sets.length) return res.status(400).json({ message:'No fields to update' });
    sets.push("updated_at=NOW()");
    params.push(req.params.id);
    const { rows } = await pool.query(`UPDATE maintenance_records SET ${sets.join(',')} WHERE id=$${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ message:'Record not found' });
    res.json({ ...toCamel(rows[0]), _id: rows[0].id });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.delete('/api/maintenance/:id', protect, admin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM maintenance_records WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message:'Record not found' });
    res.json({ message:'Maintenance record deleted' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/maintenance/bus/:busId', protect, admin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM maintenance_records WHERE bus_id=$1 ORDER BY service_date DESC',
      [req.params.busId]
    );
    res.json(rows.map(r => ({ ...toCamel(r), _id: r.id })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

/* -------------------------------------------------------
   User Profile + Emergency Contact (Feature 5)
   ------------------------------------------------------- */
app.get('/api/users/profile', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,role,emergency_name,emergency_relationship,emergency_phone FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message:'User not found' });
    const u = rows[0];
    res.json({ id: u.id, _id: u.id, name: u.name, email: u.email, role: u.role,
      emergencyName: u.emergency_name, emergencyRelationship: u.emergency_relationship, emergencyPhone: u.emergency_phone });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.put('/api/users/profile', protect, async (req, res) => {
  try {
    const { emergencyName, emergencyRelationship, emergencyPhone } = req.body;
    await pool.query(
      'UPDATE users SET emergency_name=$1, emergency_relationship=$2, emergency_phone=$3 WHERE id=$4',
      [emergencyName||'', emergencyRelationship||'', emergencyPhone||'', req.user.id]
    );
    res.json({ message:'Profile updated' });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

/* -------------------------------------------------------
   Dynamic schedule generator — creates schedules for
   future dates that do not yet have any.
   Called by a midnight cron job and on startup.
   ------------------------------------------------------- */
const TIME_SLOTS = [
  '06:00','07:30','08:00','09:15','10:30',
  '11:00','12:15','13:00','14:30','15:45',
  '16:00','17:30','18:15','19:00','20:30',
  '21:00','22:00','22:45'
];
const ROUTE_BASE_FARES = [1200, 1800, 3000, 800, 600, 700, 500, 900];

async function ensureFutureSchedules(aheadDays = 7) {
  const client = await pool.connect();
  try {
    const { rows: [{ today }] } = await client.query("SELECT CURRENT_DATE::date AS today");

    const { rows: routes } = await client.query('SELECT id,stops FROM routes ORDER BY id');
    if (!routes.length) { console.log('[cron] No routes found, skipping.'); return; }

    const { rows: buses } = await client.query('SELECT id,capacity FROM buses WHERE status=$1 ORDER BY id', ['Active']);
    if (!buses.length) { console.log('[cron] No active buses found, skipping.'); return; }

    /* generate date list: today through today+(aheadDays-1) — 7 days total */
    const { rows: dateRows } = await client.query(
      `SELECT d::text FROM generate_series($1::date, $1::date + $2::int, '1 day') AS d`,
      [today, aheadDays - 1]
    );
    const dateStrs = dateRows.map(r => r.d);

    /* find which dates are missing schedules */
    const { rows: existing } = await client.query(
      `SELECT DISTINCT departure_date::text AS d FROM schedules WHERE departure_date >= $1 AND departure_date <= $2`,
      [dateStrs[0], dateStrs[dateStrs.length - 1]]
    );
    const existingSet = new Set(existing.map(r => r.d));
    const neededDates = dateStrs.filter(d => !existingSet.has(d));

    if (neededDates.length) {
      console.log(`[cron] Generating schedules for ${neededDates.length} missing date(s): ${neededDates.join(', ')}`);

      const routePairs = routes.map(r => {
        const stops = r.stops || [];
        const pairs = [];
        for (let i = 0; i < stops.length; i++)
          for (let j = i + 1; j < stops.length; j++)
            pairs.push({ oi: i, dj: j });
        return { id: r.id, stops, pairs };
      });

      let globalIdx = 0;
      const schedBatch = [];
      for (let ri = 0; ri < routePairs.length; ri++) {
        const rp = routePairs[ri];
        const baseFare = ROUTE_BASE_FARES[ri] || 1200;
        for (const pair of rp.pairs) {
          const proportion = (pair.dj - pair.oi) / (rp.stops.length - 1);
          for (const ds of neededDates) {
            const bus = buses[globalIdx % buses.length];
            const ts = TIME_SLOTS[globalIdx % TIME_SLOTS.length];
            const fare = Math.round(baseFare * proportion + Math.random() * 500);
            schedBatch.push({ busId: bus.id, routeId: rp.id, date: ds, time: ts, fare, capacity: bus.capacity });
            globalIdx++;
          }
        }
      }

      const BATCH = 100;
      const newScheduleIds = [];
      for (let i = 0; i < schedBatch.length; i += BATCH) {
        const chunk = schedBatch.slice(i, i + BATCH);
        const placeholders = [];
        const params = [];
        let pIdx = 1;
        for (const s of chunk) {
          placeholders.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}::date, $${pIdx + 3}::time, $${pIdx + 4})`);
          params.push(s.busId, s.routeId, s.date, s.time, s.fare);
          pIdx += 5;
        }
        const { rows: inserted } = await client.query(
          `INSERT INTO schedules (bus_id,route_id,departure_date,departure_time,fare)
           VALUES ${placeholders.join(',')} RETURNING id, bus_id`,
          params
        );
        for (const row of inserted) {
          const bus = buses.find(b => b.id === row.bus_id);
          newScheduleIds.push({ id: row.id, capacity: bus ? bus.capacity : 40 });
        }
        console.log(`[cron]  Inserted schedules ${i + 1}–${Math.min(i + BATCH, schedBatch.length)}/${schedBatch.length}`);
      }

      let seatCount = 0;
      for (let i = 0; i < newScheduleIds.length; i++) {
        const { id: schedId, capacity } = newScheduleIds[i];
        const sPlaceholders = [];
        const sParams = [];
        let sIdx = 1;
        for (let s = 1; s <= capacity; s++) {
          sPlaceholders.push(`($${sIdx}, $${sIdx + 1})`);
          sParams.push(schedId, `S${s}`);
          sIdx += 2;
        }
        await client.query(`INSERT INTO seats (schedule_id,seat_number) VALUES ${sPlaceholders.join(',')}`, sParams);
        seatCount += capacity;
        if ((i + 1) % 50 === 0 || i === newScheduleIds.length - 1)
          console.log(`[cron]  Seats created for ${i + 1}/${newScheduleIds.length} schedules`);
      }
      console.log(`[cron] Done — ${newScheduleIds.length} new schedules, ${seatCount} seats.`);
    } else {
      console.log('[cron] All dates already have schedules.');
    }

    /* clean up expired schedules (before today) */
    try {
      await client.query('DELETE FROM seats WHERE schedule_id IN (SELECT id FROM schedules WHERE departure_date < $1)', [today]);
      const { rowCount } = await client.query('DELETE FROM schedules WHERE departure_date < $1', [today]);
      if (rowCount > 0) console.log(`[cron] Cleaned ${rowCount} expired schedule(s).`);
    } catch (e) {
      console.log('[cron] Expired schedule cleanup skipped:', e.message);
    }

    /* clean up expired seat holds */
    try {
      const { rowCount: holdCount } = await client.query('DELETE FROM seat_holds WHERE expires_at < NOW()');
      if (holdCount > 0) console.log(`[cron] Cleaned ${holdCount} expired seat hold(s).`);
    } catch (e) {
      console.log('[cron] Hold cleanup skipped:', e.message);
    }
  } catch (e) {
    console.error('[cron] Schedule generation error:', e.message);
  } finally {
    client.release();
  }
}

/* midnight cron — generate schedules for the next 7 days */
cron.schedule('0 0 * * *', () => {
  console.log('[cron] Midnight trigger — generating upcoming schedules...');
  ensureFutureSchedules(7);
});

/* periodic hold cleanup — every minute */
cron.schedule('* * * * *', async () => {
  try {
    const { rows: expired } = await pool.query(
      'SELECT DISTINCT schedule_id, seat_number FROM seat_holds WHERE expires_at < NOW()'
    );
    if (expired.length > 0) {
      await pool.query('DELETE FROM seat_holds WHERE expires_at < NOW()');
      /* notify all connected clients about released holds */
      expired.forEach(h => {
        io.emit('seatReleased', { scheduleId: h.schedule_id, seatNumber: h.seat_number });
      });
    }
  } catch (e) { /* silent */ }
});

/* also run once on startup so future days are always seeded */
ensureFutureSchedules(7);

app.get('/', (req, res) => res.send('Smart Bus System API is running...'));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (!res.headersSent) res.status(err.status||500).json({ message:err.message||'Internal Server Error' });
});

process.on('uncaughtException', err => console.error('Uncaught exception:', err.message));
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason));

/* ───── Haversine distance formula ───── */
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371; /* Earth radius in km */
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ───── Sri-Lankan city → GPS coordinate lookup ───── */
const STOP_COORDS = {
  Colombo:           { lat:  6.9271, lng: 79.8612 },
  Kadawatha:         { lat:  6.9941, lng: 79.9583 },
  Nittambuwa:        { lat:  7.1431, lng: 80.0981 },
  Kegalle:           { lat:  7.2513, lng: 80.3464 },
  Peradeniya:        { lat:  7.2673, lng: 80.6000 },
  Kandy:             { lat:  7.2906, lng: 80.6337 },
  Kottawa:           { lat:  6.8476, lng: 79.9630 },
  Gelanigama:        { lat:  6.7750, lng: 80.0000 },
  Galle:             { lat:  6.0535, lng: 80.2210 },
  Matara:            { lat:  5.9549, lng: 80.5550 },
  Kurunegala:        { lat:  7.4868, lng: 80.3645 },
  Anuradhapura:      { lat:  8.3114, lng: 80.4037 },
  Vavuniya:          { lat:  8.7514, lng: 80.4970 },
  Kilinochchi:       { lat:  9.3814, lng: 80.4119 },
  Jaffna:            { lat:  9.6615, lng: 80.0255 },
  Gampola:           { lat:  7.1649, lng: 80.5696 },
  Pussellawa:        { lat:  7.1066, lng: 80.6360 },
  Ramboda:           { lat:  7.0565, lng: 80.6880 },
  'Nuwara Eliya':    { lat:  6.9497, lng: 80.7891 },
  Katugasthota:      { lat:  7.3304, lng: 80.6329 },
  Wattegama:         { lat:  7.3509, lng: 80.6537 },
  Matale:            { lat:  7.4712, lng: 80.6232 },
  Negombo:           { lat:  7.2083, lng: 79.8358 },
  Kochchikade:       { lat:  7.2593, lng: 79.8528 },
  Wennappuwa:        { lat:  7.3410, lng: 79.8465 },
  Chilaw:            { lat:  7.5758, lng: 79.7953 },
  Ratnapura:         { lat:  6.7056, lng: 80.3847 },
  Kuruwita:          { lat:  6.8011, lng: 80.3679 },
  Avissawella:       { lat:  6.9493, lng: 80.2174 },
  Padaviya:          { lat:  8.7883, lng: 80.6516 },
  Kanthale:          { lat:  8.4044, lng: 81.0052 },
  Trincomalee:       { lat:  8.5874, lng: 81.2152 },
};

/* ───── socket → userId mapping for targeted alerts ───── */
const socketUserMap = {};   /* socketId → userId */

io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);

  /* register user identity so we can emit targeted events */
  socket.on('registerUser', (userId) => {
    if (!userId) return;
    socketUserMap[socket.id] = userId;
    socket.userId = userId;
    console.log(`Socket ${socket.id} registered as user ${userId}`);
  });

  /* passenger joins rooms for their booked schedules */
  socket.on('joinScheduleRooms', (scheduleIds) => {
    if (!Array.isArray(scheduleIds)) return;
    scheduleIds.forEach(id => {
      socket.join(`schedule_${id}`);
      console.log(`Socket ${socket.id} joined room schedule_${id}`);
    });
  });

  /* cleanup when passenger leaves (e.g. navigates away) */
  socket.on('leaveScheduleRooms', (scheduleIds) => {
    if (!Array.isArray(scheduleIds)) return;
    scheduleIds.forEach(id => socket.leave(`schedule_${id}`));
  });

  /* ───── Conductor streams live GPS ───── */
  socket.on('updateBusLocation', async ({ scheduleId, lat, lng }) => {
    if (!scheduleId || lat == null || lng == null) return;

    /* broadcast the bus position to every passenger in that schedule room */
    io.to(`schedule_${scheduleId}`).emit('busLocationUpdated', { scheduleId, lat, lng });

    /* ── proximity check: is the bus within 5 km of any passenger's stop? ── */
    try {
      /* fetch route stops for this schedule */
      const { rows: [sched] } = await pool.query(
        `SELECT r.stops FROM schedules s JOIN routes r ON s.route_id=r.id WHERE s.id=$1`,
        [scheduleId]
      );
      if (!sched) return;
      const stops = sched.stops || [];

      /* fetch all Confirmed passengers for this schedule */
      const { rows: passengers } = await pool.query(
        `SELECT b.passenger_id, b.end_stop FROM bookings b WHERE b.schedule_id=$1 AND b.status='Confirmed'`,
        [scheduleId]
      );

      for (const p of passengers) {
        const destName = p.end_stop;
        const destCoords = STOP_COORDS[destName];
        if (!destCoords) continue;

        const dist = haversine(lat, lng, destCoords.lat, destCoords.lng);
        if (dist <= 5.0) {
          /* find all sockets belonging to this passenger and alert them */
          for (const [sid, uid] of Object.entries(socketUserMap)) {
            if (uid === p.passenger_id) {
              io.to(sid).emit('proximityAlert', {
                scheduleId,
                stopName: destName,
                distanceKm: Math.round(dist * 100) / 100,
                busLat: lat,
                busLng: lng,
                stopLat: destCoords.lat,
                stopLng: destCoords.lng,
                message: `Your stop "${destName}" is only ${Math.round(dist * 100) / 100} km away!`
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[proximity] check error:', e.message);
    }
  });

  socket.on('disconnect', () => {
    delete socketUserMap[socket.id];
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.timeout = 120000;
