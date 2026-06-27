const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();

  console.log('Dropping all tables...');
  await db.query('DROP TABLE IF EXISTS bookings CASCADE');
  await db.query('DROP TABLE IF EXISTS seats CASCADE');
  await db.query('DROP TABLE IF EXISTS schedules CASCADE');
  await db.query('DROP TABLE IF EXISTS buses CASCADE');
  await db.query('DROP TABLE IF EXISTS routes CASCADE');
  await db.query('DROP TABLE IF EXISTS users CASCADE');

  console.log('Creating 6 tables...');
  await db.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'passenger',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  await db.query(`
    CREATE TABLE routes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      stops JSONB NOT NULL,
      distance NUMERIC(10,2) NOT NULL DEFAULT 0,
      estimated_duration VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  await db.query(`
    CREATE TABLE buses (
      id SERIAL PRIMARY KEY,
      bus_number VARCHAR(255) NOT NULL UNIQUE,
      capacity INT DEFAULT 40,
      type VARCHAR(20) DEFAULT 'Standard',
      photo VARCHAR(500) DEFAULT '',
      status VARCHAR(20) DEFAULT 'Active',
      conductor_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conductor_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
  await db.query(`
    CREATE TABLE schedules (
      id SERIAL PRIMARY KEY,
      bus_id INT NOT NULL,
      route_id INT NOT NULL,
      departure_date DATE NOT NULL,
      departure_time TIME NOT NULL,
      fare NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )`);
  await db.query(`
    CREATE TABLE seats (
      id SERIAL PRIMARY KEY,
      schedule_id INT NOT NULL,
      seat_number VARCHAR(10) NOT NULL,
      is_broken BOOLEAN DEFAULT false,
      booked_segments JSONB DEFAULT '[]'::jsonb,
      booked_by_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (booked_by_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
  await db.query(`
    CREATE TABLE bookings (
      id SERIAL PRIMARY KEY,
      schedule_id INT NOT NULL,
      passenger_id INT,
      seats_booked JSONB NOT NULL,
      start_stop VARCHAR(255) NOT NULL DEFAULT '',
      end_stop VARCHAR(255) NOT NULL DEFAULT '',
      total_fare NUMERIC(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Confirmed',
      payment_status VARCHAR(50) DEFAULT 'Paid',
      booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

  console.log('Seeding 31 users (1 admin + 30 conductors)...');
  const hash = await bcrypt.hash('admin123', 10);
  const userValues = [['Admin', 'admin@smartbus.lk', hash, 'admin']];
  const names = [
    'Samantha Perera','Nimlesh Silva','Asanka Fernando','Priya Jayawardena','Kamal Gunasekara',
    'Dinesh Weerasinghe','Chaminda Rathnayake','Thilini Kumari','Ruwan Dissanayake','Anusha Peiris',
    'Lakshman Bandara','Dilani Ekanayake','Sunil Abeysekara','Upul Wickramasinghe','Shanika Madushani',
    'Nishantha Hettiarachchi','Rohini Dayaratne','Ajith Senanayake','Sameera Jayasuriya','Manoj Gunaratne',
    'Kavinda Rajapaksa','Champa Wickramaratne','Sarath Fonseka','Anoma Wijewardena','Prasanna Jayaweera',
    'Deepani Alwis','Hemantha Perera','Kusum Rathnayake','Janaka Bandara','Nadeeka Priyadarshani'
  ];
  for (let i = 0; i < 30; i++) {
    userValues.push([names[i], `conductor${i+1}@smartbus.lk`, hash, 'conductor']);
  }
  let pIdx = 1;
  const uPlaceholders = userValues.map(() => `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
  await db.query(`INSERT INTO users (name,email,password,role) VALUES ${uPlaceholders.join(',')}`, userValues.flat());

  console.log('Seeding 8 routes with real Sri Lankan stops...');
  const routeDefs = [
    { name:'Colombo to Kandy',            stops:['Colombo','Kadawatha','Nittambuwa','Kegalle','Peradeniya','Kandy'], dist:116, dur:'3h 00m' },
    { name:'Kadawatha to Matara (Highway)',stops:['Kadawatha','Kottawa','Gelanigama','Galle','Matara'],             dist:148, dur:'2h 15m' },
    { name:'Colombo to Jaffna',           stops:['Colombo','Kurunegala','Anuradhapura','Vavuniya','Kilinochchi','Jaffna'], dist:406, dur:'8h 30m' },
    { name:'Gampola to Nuwara Eliya',     stops:['Gampola','Pussellawa','Ramboda','Nuwara Eliya'],                  dist:42,  dur:'1h 45m' },
    { name:'Kandy to Matale',             stops:['Kandy','Katugasthota','Wattegama','Matale'],                      dist:36,  dur:'1h 15m' },
    { name:'Negombo to Chilaw',           stops:['Negombo','Kochchikade','Wennappuwa','Chilaw'],                   dist:50,  dur:'1h 20m' },
    { name:'Ratnapura to Avissawella',    stops:['Ratnapura','Kuruwita','Avissawella'],                             dist:28,  dur:'0h 50m' },
    { name:'Anuradhapura to Trincomalee', stops:['Anuradhapura','Padaviya','Kanthale','Trincomalee'],              dist:110, dur:'2h 30m' }
  ];
  pIdx = 1;
  const rPlaceholders = routeDefs.map(() => `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
  const rFlat = [];
  routeDefs.forEach(r => { rFlat.push(r.name, JSON.stringify(r.stops), r.dist, r.dur); });
  await db.query(`INSERT INTO routes (name,stops,distance,estimated_duration) VALUES ${rPlaceholders.join(',')}`, rFlat);

  console.log('Seeding 35 buses...');
  const busTypesCycle = ['Luxury','Luxury','Standard','AC','Standard','Luxury','Standard','AC','Luxury','Standard'];
  const busCapsCycle  = [45, 40, 49, 54, 42, 48, 44, 50, 46, 52];
  const busBatch = [];
  for (let i = 1; i <= 35; i++) {
    busBatch.push({ num: `WP ND-${1000+i}`, cap: busCapsCycle[(i-1)%10], type: busTypesCycle[(i-1)%10], cond: i <= 30 ? i + 1 : null });
  }
  pIdx = 1;
  const bPlaceholders = busBatch.map(() => `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
  const bFlat = [];
  busBatch.forEach(b => { bFlat.push(b.num, b.cap, b.type, b.cond); });
  await db.query(`INSERT INTO buses (bus_number,capacity,type,conductor_id) VALUES ${bPlaceholders.join(',')}`, bFlat);

  console.log('Generating schedules for EVERY sub-trip pair across 7 days...');
  const timeSlots = [
    '06:00','07:30','08:00','09:15','10:30',
    '11:00','12:15','13:00','14:30','15:45',
    '16:00','17:30','18:15','19:00','20:30',
    '21:00','22:00','22:45'
  ];
  const routeBaseFares = [1200, 1800, 3000, 800, 600, 700, 500, 900];

  const schedBatch = [];
  let globalIdx = 0;

  for (let ri = 0; ri < routeDefs.length; ri++) {
    const stops = routeDefs[ri].stops;
    const pairs = [];
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        pairs.push({ oi: i, dj: j });
      }
    }
    for (let pi = 0; pi < pairs.length; pi++) {
      const proportion = (pairs[pi].dj - pairs[pi].oi) / (stops.length - 1);
      const baseFare = routeBaseFares[ri];
      for (let day = 0; day < 7; day++) {
        schedBatch.push({ busId: (globalIdx % 35) + 1, routeId: ri + 1, day, time: timeSlots[globalIdx % timeSlots.length], fare: Math.round(baseFare * proportion + Math.random() * 500) });
        globalIdx++;
      }
    }
  }

  const BATCH = 100;
  for (let i = 0; i < schedBatch.length; i += BATCH) {
    const chunk = schedBatch.slice(i, i + BATCH);
    const sPlaceholders = [];
    const sParams = [];
    let sIdx = 1;
    for (const s of chunk) {
      sPlaceholders.push(`($${sIdx}, $${sIdx+1}, CURRENT_DATE + INTERVAL '${s.day} days', $${sIdx+2}, $${sIdx+3})`);
      sParams.push(s.busId, s.routeId, s.time, s.fare);
      sIdx += 4;
    }
    await db.query(`INSERT INTO schedules (bus_id,route_id,departure_date,departure_time,fare) VALUES ${sPlaceholders.join(',')}`, sParams);
    console.log(`  Inserted schedules ${i+1}–${Math.min(i+BATCH, schedBatch.length)}/${schedBatch.length}...`);
  }

  const { rows: busRows } = await db.query('SELECT id,capacity FROM buses ORDER BY id');
  const busCaps = {};
  busRows.forEach(b => { busCaps[b.id] = b.capacity; });

  const { rows: schedRows } = await db.query('SELECT id,bus_id FROM schedules ORDER BY id');
  let totalSeats = 0;
  for (let i = 0; i < schedRows.length; i++) {
    const { id: schedId, bus_id } = schedRows[i];
    const cap = busCaps[bus_id];
    const sPlaceholders = [];
    const sParams = [];
    let sIdx = 1;
    for (let s = 1; s <= cap; s++) {
      sPlaceholders.push(`($${sIdx}, $${sIdx+1})`);
      sParams.push(schedId, `S${s}`);
      sIdx += 2;
    }
    await db.query(`INSERT INTO seats (schedule_id,seat_number) VALUES ${sPlaceholders.join(',')}`, sParams);
    totalSeats += cap;
    if ((i + 1) % 50 === 0 || i === schedRows.length - 1) {
      console.log(`  Seats created for ${i + 1}/${schedRows.length} schedules...`);
    }
  }

  console.log('Verifying...');
  for (const table of ['users','routes','buses','schedules','seats']) {
    const { rows: [{ cnt }] } = await db.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
    console.log(`  ${table}: ${cnt}`);
  }

  await db.end();
  console.log(`Done — ${schedRows.length} schedules across ${routeDefs.length} routes, ${totalSeats} seats.`);
  console.log('Admin: admin@smartbus.lk / admin123');
  console.log('30 conductors: conductor1@smartbus.lk ... conductor30@smartbus.lk / admin123');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
