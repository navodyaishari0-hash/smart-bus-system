const { Client } = require('pg');
require('dotenv').config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL required');
    process.exit(1);
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();

  console.log('Running feature migrations...');

  // Feature 2 & 5: Add discount + emergency contact columns to bookings
  await db.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'None',
      ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50) DEFAULT ''
  `).catch(e => console.log('  bookings alter skipped:', e.message));

  // Feature 5: Emergency contact on users table
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50) DEFAULT ''
  `).catch(e => console.log('  users alter skipped:', e.message));

  // Feature 1: Seat holds table
  await db.query(`
    CREATE TABLE IF NOT EXISTS seat_holds (
      id SERIAL PRIMARY KEY,
      schedule_id INT NOT NULL,
      seat_number VARCHAR(10) NOT NULL,
      user_id INT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  // Index for fast lookups + cleanup
  await db.query('CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON seat_holds(expires_at)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_seat_holds_schedule ON seat_holds(schedule_id, seat_number)');

  // Feature 3: Delay alerts table
  await db.query(`
    CREATE TABLE IF NOT EXISTS delay_alerts (
      id SERIAL PRIMARY KEY,
      schedule_id INT NOT NULL,
      delay_minutes INT NOT NULL DEFAULT 0,
      reason VARCHAR(500) NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_delay_alerts_active ON delay_alerts(is_active)');

  // Feature 4: Maintenance records table
  await db.query(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id SERIAL PRIMARY KEY,
      bus_id INT NOT NULL,
      maintenance_type VARCHAR(100) NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      service_date DATE NOT NULL,
      expected_completion_date DATE NOT NULL,
      cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      mechanic VARCHAR(255) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_maintenance_bus ON maintenance_records(bus_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status)');

  // Verify
  const tables = ['seat_holds', 'delay_alerts', 'maintenance_records'];
  for (const t of tables) {
    const { rows: [{ cnt }] } = await db.query(`SELECT COUNT(*)::int AS cnt FROM ${t}`);
    console.log(`  ${t}: ${cnt} rows`);
  }
  const { rows: bookCols } = await db.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name LIKE 'discount_%' OR column_name LIKE 'emergency_%'
  `);
  console.log('  bookings new columns:', bookCols.map(r => r.column_name).join(', '));

  await db.end();
  console.log('Migration complete.');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
