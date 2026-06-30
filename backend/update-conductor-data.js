const { Pool } = require('pg');
require('dotenv').config();

const BUSES_PER_CONDUCTOR = 3;
const TIME_SLOTS = ['06:00', '12:30', '18:15'];
const BUS_TYPES_CYCLE = ['Luxury','Standard','AC','Standard','Luxury','AC','Standard','Luxury','AC','Standard'];
const BUS_CAPS_CYCLE  = [45, 49, 40, 54, 42, 48, 44, 50, 46, 52];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  /* ---------- 1. Get all conductors ---------- */
  const { rows: conductors } = await pool.query(
    "SELECT id FROM users WHERE role='conductor' ORDER BY id"
  );
  const totalConductors = conductors.length;
  console.log(`Found ${totalConductors} conductors`);

  const totalBusesNeeded = totalConductors * BUSES_PER_CONDUCTOR;

  /* ---------- 2. Get current bus count and create missing buses ---------- */
  const { rows: [{ cnt: currentBuses }] } = await pool.query('SELECT COUNT(*)::int AS cnt FROM buses');
  console.log(`Current buses: ${currentBuses}, need: ${totalBusesNeeded}`);

  if (currentBuses < totalBusesNeeded) {
    const newBusBatch = [];
    for (let i = currentBuses + 1; i <= totalBusesNeeded; i++) {
      const idx = i - 1;
      newBusBatch.push({
        num: `WP ND-${5000 + i}`,
        cap: BUS_CAPS_CYCLE[idx % BUS_CAPS_CYCLE.length] + (idx % 5),
        type: BUS_TYPES_CYCLE[idx % BUS_TYPES_CYCLE.length]
      });
    }
    let pIdx = 1;
    const placeholders = newBusBatch.map(() => `($${pIdx++}, $${pIdx++}, $${pIdx++})`);
    const flat = [];
    newBusBatch.forEach(b => { flat.push(b.num, b.cap, b.type); });
    await pool.query(
      `INSERT INTO buses (bus_number,capacity,type) VALUES ${placeholders.join(',')}`,
      flat
    );
    console.log(`Created ${newBusBatch.length} new buses`);
  }

  /* ---------- 3. Assign 3 buses to each conductor ---------- */
  const { rows: allBuses } = await pool.query('SELECT id FROM buses ORDER BY id');
  const assignments = [];
  for (let ci = 0; ci < totalConductors; ci++) {
    for (let bi = 0; bi < BUSES_PER_CONDUCTOR; bi++) {
      const busIdx = ci * BUSES_PER_CONDUCTOR + bi;
      if (busIdx < allBuses.length) {
        assignments.push({ busId: allBuses[busIdx].id, conductorId: conductors[ci].id });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* clear old conductor assignments */
    await client.query('UPDATE buses SET conductor_id=NULL');

    for (const a of assignments) {
      await client.query('UPDATE buses SET conductor_id=$1 WHERE id=$2', [a.conductorId, a.busId]);
    }
    console.log(`Assigned ${BUSES_PER_CONDUCTOR} buses to each of ${totalConductors} conductors`);

    /* ---------- 4. Remove today's schedules + seats for these buses (CASCADE handles seats) ---------- */
    const busIds = assignments.map(a => a.busId);
    const delResult = await client.query(
      `DELETE FROM schedules WHERE bus_id = ANY($1::int[]) AND departure_date = CURRENT_DATE`,
      [busIds]
    );
    console.log(`Removed ${delResult.rowCount} old schedule(s) for today`);

    /* ---------- 5. Get routes for schedule creation ---------- */
    const { rows: routes } = await client.query('SELECT id, stops FROM routes ORDER BY id');
    if (!routes.length) { console.error('No routes found'); await client.query('ROLLBACK'); return; }

    /* ---------- 6. Insert 3 schedules per conductor for today ---------- */
    const schedBatch = [];
    for (let ci = 0; ci < totalConductors; ci++) {
      const conductorId = conductors[ci].id;
      for (let bi = 0; bi < BUSES_PER_CONDUCTOR; bi++) {
        const busIdx = ci * BUSES_PER_CONDUCTOR + bi;
        if (busIdx >= allBuses.length) break;
        const busId = allBuses[busIdx].id;
        const route = routes[(ci + bi) % routes.length];
        const stops = route.stops || [];
        const startStop = stops[0];
        const endStop = stops[stops.length - 1];
        schedBatch.push({
          busId,
          routeId: route.id,
          time: TIME_SLOTS[bi],
          fare: Math.round(800 + Math.random() * 2200),
          startStop,
          endStop
        });
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
        placeholders.push(`($${pIdx}, $${pIdx + 1}, CURRENT_DATE, $${pIdx + 2}::time, $${pIdx + 3})`);
        params.push(s.busId, s.routeId, s.time, s.fare);
        pIdx += 4;
      }
      const { rows: inserted } = await client.query(
        `INSERT INTO schedules (bus_id,route_id,departure_date,departure_time,fare)
         VALUES ${placeholders.join(',')} RETURNING id, bus_id`,
        params
      );
      for (const row of inserted) {
        newScheduleIds.push({ id: row.id, bus_id: row.bus_id });
      }
    }
    console.log(`Created ${newScheduleIds.length} schedules for today`);

    /* ---------- 7. Get bus capacities ---------- */
    const { rows: busCaps } = await client.query('SELECT id, capacity FROM buses ORDER BY id');
    const capMap = {};
    busCaps.forEach(b => { capMap[b.id] = b.capacity; });

    /* ---------- 8. Create seats for each new schedule ---------- */
    let totalSeats = 0;
    for (let i = 0; i < newScheduleIds.length; i++) {
      const { id: schedId, bus_id } = newScheduleIds[i];
      const capacity = capMap[bus_id] || 40;

      const sPlaceholders = [];
      const sParams = [];
      let sIdx = 1;
      for (let s = 1; s <= capacity; s++) {
        sPlaceholders.push(`($${sIdx}, $${sIdx + 1})`);
        sParams.push(schedId, `S${s}`);
        sIdx += 2;
      }
      await client.query(`INSERT INTO seats (schedule_id,seat_number) VALUES ${sPlaceholders.join(',')}`, sParams);
      totalSeats += capacity;
    }
    console.log(`Created ${totalSeats} seats across ${newScheduleIds.length} schedules`);

    await client.query('COMMIT');
    console.log('Done — conductor data updated successfully.');

    /* ---------- 9. Verification ---------- */
    const { rows: verify } = await pool.query(
      `SELECT u.name AS conductor, COUNT(*) AS schedule_count
       FROM schedules s
       JOIN buses b ON s.bus_id = b.id
       JOIN users u ON b.conductor_id = u.id
       WHERE s.departure_date = CURRENT_DATE AND u.role = 'conductor'
       GROUP BY u.name
       ORDER BY u.name
       LIMIT 5`
    );
    console.log('\nSample verification (first 5 conductors):');
    verify.forEach(v => console.log(`  ${v.conductor}: ${v.schedule_count} schedule(s) today`));

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
