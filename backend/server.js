const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
      clauses.push(`s.departure_date = $${pIdx++}`);
      params.push(date);
      const { rows: [{ todayStr }] } = await pool.query("SELECT CURRENT_DATE::text AS today_str");
      if (date === todayStr) clauses.push(`s.departure_time >= LOCALTIME`);
    } else {
      clauses.push(`s.departure_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'`);
      clauses.push(`(s.departure_date > CURRENT_DATE OR (s.departure_date = CURRENT_DATE AND s.departure_time >= LOCALTIME))`);
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
      return {
        id:s.id, _id:s.id, bus_id:s.bus_id, route_id:s.route_id,
        departureDate:s.departure_date, departureTime:s.departure_time, fare:s.fare,
        stops, seats,
        searchedOrigin: o || null, searchedDestination: d || null,
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
    const { rows: [b] } = await pool.query('SELECT id,capacity FROM buses WHERE id=$1', [bus]);
    if (!b) return res.status(404).json({ message:'Bus not found' });
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
    res.json({
      id:s.id, _id:s.id, departureDate:s.departure_date, departureTime:s.departure_time, fare:s.fare,
      stops, seats,
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
    res.json({ message:'Seat status updated', seat: { ...toCamel(u), _id:u.id } });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.post('/api/bookings', protect, async (req, res) => {
  try {
    const { scheduleId, seatsToBook, startStop, endStop } = req.body;
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
      const totalFare = (fare && !isNaN(Number(fare)) ? Number(fare) : 0) * seatsToBook.length;
      const { rows: [bk] } = await conn.query(
        "INSERT INTO bookings (passenger_id,schedule_id,seats_booked,total_fare,start_stop,end_stop,status) VALUES ($1,$2,$3,$4,$5,$6,'Confirmed') RETURNING id",
        [req.user.id, scheduleId, JSON.stringify(seatsToBook), totalFare, startStop, endStop]
      );
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
      } catch(e) { console.error('Socket emit error:', e.message); }

      const { rows: [b] } = await pool.query(
        `SELECT b.id, b.passenger_id, b.schedule_id, b.seats_booked, b.total_fare, b.start_stop, b.end_stop,
          b.status, b.payment_status, b.booking_date, b.created_at,
          u.name AS pn, u.email AS pe
         FROM bookings b LEFT JOIN users u ON b.passenger_id=u.id WHERE b.id=$1`,
        [bk.id]
      );
      if (!b) return res.status(500).json({ message:'Booking created but retrieval failed' });
      res.status(201).json({
        id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
        seatsBooked:b.seats_booked || [], totalFare:Number(b.total_fare), startStop:b.start_stop, endStop:b.end_stop,
        status:b.status, paymentStatus:b.payment_status, bookingDate:b.booking_date,
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
        u.name AS pn, u.email AS pe,
        s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        bu.bus_number, r.name AS route_name
       FROM bookings b LEFT JOIN users u ON b.passenger_id=u.id
       LEFT JOIN schedules s ON b.schedule_id=s.id
       LEFT JOIN buses bu ON s.bus_id=bu.id
       LEFT JOIN routes r ON s.route_id=r.id
       ORDER BY b.created_at DESC`
    );
    res.json(rows.map(b => ({
      id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
      seatsBooked:b.seats_booked || [], totalFare:b.total_fare ? Number(b.total_fare) : 0,
      startStop:b.start_stop, endStop:b.end_stop, status:b.status, paymentStatus:b.payment_status,
      bookingDate:b.booking_date, createdAt:b.created_at,
      passenger: b.passenger_id ? { id:b.passenger_id, _id:b.passenger_id, name:b.pn, email:b.pe } : null,
      schedule: b.schedule_id ? {
        id:b.schedule_id, _id:b.schedule_id, departureDate:b.departure_date, departureTime:b.departure_time, fare:b.fare ? Number(b.fare) : 0,
        bus: { id:b.bus_id, _id:b.bus_id, busNumber:b.bus_number },
        route: { id:b.route_id, _id:b.route_id, name:b.route_name }
      } : null
    })));
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/bookings/mybookings', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.passenger_id, b.schedule_id, b.seats_booked, b.total_fare, b.start_stop, b.end_stop,
        b.status, b.payment_status, b.booking_date, b.created_at,
        s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        bu.bus_number, r.name AS route_name, r.stops AS route_stops
       FROM bookings b LEFT JOIN schedules s ON b.schedule_id=s.id
       LEFT JOIN buses bu ON s.bus_id=bu.id
       LEFT JOIN routes r ON s.route_id=r.id
       WHERE b.passenger_id=$1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(b => ({
      id:b.id, _id:b.id, passenger_id:b.passenger_id, schedule_id:b.schedule_id,
      seatsBooked:b.seats_booked || [], totalFare:b.total_fare ? Number(b.total_fare) : 0,
      startStop:b.start_stop, endStop:b.end_stop, status:b.status, paymentStatus:b.payment_status,
      bookingDate:b.booking_date, createdAt:b.created_at,
      schedule: b.schedule_id ? {
        id:b.schedule_id, _id:b.schedule_id, departureDate:b.departure_date, departureTime:b.departure_time, fare:b.fare ? Number(b.fare) : 0,
        bus: { id:b.bus_id, _id:b.bus_id, busNumber:b.bus_number },
        route: { id:b.route_id, _id:b.route_id, name:b.route_name, stops: (b.route_stops || []).map(s => s) }
      } : null
    })));
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
    const { rows: [b] } = await pool.query('SELECT id FROM buses WHERE conductor_id=$1 LIMIT 1', [req.user.id]);
    if (!b) return res.json([]);
    const { rows } = await pool.query(
      `SELECT s.id, s.bus_id, s.route_id, s.departure_date, s.departure_time, s.fare,
        b.bus_number, b.type AS bus_type, b.status AS bus_status, b.conductor_id AS bus_conductor_id,
        r.name AS route_name, r.stops AS route_stops
       FROM schedules s JOIN buses b ON s.bus_id=b.id JOIN routes r ON s.route_id=r.id
       WHERE s.bus_id=$1 ORDER BY s.departure_date, s.departure_time`,
      [b.id]
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

    res.json(rows.map(s => {
      const stops = s.route_stops || [];
      const seats = (sm[s.id]||[]).map(st => ({
        id:st.id, _id:st.id, seatNumber:st.seat_number, isBroken:st.is_broken,
        bookedSegments:st.booked_segments || [], isBooked:(st.booked_segments||[]).length > 0
      }));
      return {
        id:s.id, _id:s.id, bus_id:s.bus_id, route_id:s.route_id,
        departureDate:s.departure_date, departureTime:s.departure_time, fare:s.fare,
        stops, seats,
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

app.get('/', (req, res) => res.send('Smart Bus System API is running...'));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (!res.headersSent) res.status(err.status||500).json({ message:err.message||'Internal Server Error' });
});

process.on('uncaughtException', err => console.error('Uncaught exception:', err.message));
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason));

io.on('connection', socket => console.log(`Socket connected: ${socket.id}`));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.timeout = 120000;
