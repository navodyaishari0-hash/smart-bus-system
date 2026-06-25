const path = require('path');
const { createRequire } = require('module');
const backendRequire = createRequire(path.resolve(__dirname, '..', 'backend', 'noop.js'));
const dotenv = backendRequire('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const { sequelize, Booking, Schedule, Route, User } = backendRequire('./models');

// ─────────────────────────────────────────────────────────────
// Seat categorisation (must match analyticsController.js)
// 4 seats per row: col 0=left-window, 1=left-aisle, 2=right-aisle, 3=right-window
// rows 0-2=Front, 3-6=Middle, 7+=Back  (40-seat bus → 10 rows)
// ─────────────────────────────────────────────────────────────
const WINDOW_COLS = new Set([0, 3]);
const FRONT_ROWS = new Set([0, 1, 2]);
const MIDDLE_ROWS = new Set([3, 4, 5, 6]);

function categorizeSeat(seatNum) {
    const n = parseInt(seatNum.replace(/^S/i, ''), 10);
    if (isNaN(n)) return { position: 'Unknown', zone: 'Unknown' };
    const col = (n - 1) % 4;
    const row = Math.floor((n - 1) / 4);
    return {
        position: WINDOW_COLS.has(col) ? 'Window' : 'Aisle',
        zone: FRONT_ROWS.has(row) ? 'Front' : MIDDLE_ROWS.has(row) ? 'Middle' : 'Back'
    };
}

// ─────────────────────────────────────────────────────────────
// Balanced seat sets covering all positions & zones
// ─────────────────────────────────────────────────────────────
const seatSets = [
    // Singles — Window (10)
    ['S1'],  ['S4'],  ['S8'],  ['S9'],  ['S12'],
    ['S16'], ['S20'], ['S25'], ['S29'], ['S36'],
    // Singles — Aisle (10)
    ['S2'],  ['S3'],  ['S6'],  ['S7'],  ['S10'],
    ['S14'], ['S18'], ['S22'], ['S30'], ['S34'],
    // Pairs — Window+Window (4)
    ['S1', 'S4'],   ['S5', 'S8'],   ['S13', 'S16'], ['S25', 'S28'],
    // Pairs — Aisle+Aisle (4)
    ['S2', 'S3'],   ['S6', 'S7'],   ['S14', 'S15'], ['S30', 'S31'],
    // Pairs — Mixed (6)
    ['S1', 'S2'],   ['S4', 'S5'],   ['S9', 'S10'],
    ['S16', 'S17'], ['S20', 'S21'], ['S33', 'S34'],
    // Triples (4)
    ['S1', 'S2', 'S3'],     ['S4', 'S5', 'S6'],
    ['S13', 'S14', 'S15'],  ['S29', 'S30', 'S31'],
    // Quads (3)
    ['S1', 'S2', 'S3', 'S4'],
    ['S13', 'S14', 'S15', 'S16'],
    ['S29', 'S30', 'S31', 'S32'],
];

// ─────────────────────────────────────────────────────────────
// Weighted hour pool  (0-23) — peaks 7-9 AM & 4-7 PM
// ─────────────────────────────────────────────────────────────
const hourPool = [];
const hourWeights = [
    0, 0, 0, 0, 0, 0,  // 00-05  overnight
    1, 1,               // 06-07  early
    4, 5, 5,            // 08-10  morning peak
    3, 3,               // 11-12  midday
    2, 2,               // 13-14  afternoon lull
    2, 3, 4,            // 15-17  building up
    5, 5, 4, 3,         // 18-21  evening peak
    1, 1                // 22-23  tapering
];
hourWeights.forEach((w, h) => { for (let i = 0; i < w; i++) hourPool.push(h); });

// ─────────────────────────────────────────────────────────────
// Day-of-week weight  0=Sun … 6=Sat
// ─────────────────────────────────────────────────────────────
const dayWeights = [5, 3, 3, 3, 3, 5, 4];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─────────────────────────────────────────────────────────────
// Weighted day-index generator (30-day window)
// ─────────────────────────────────────────────────────────────
function pickDayOffset(now) {
    const dayPool = [];
    for (let d = 0; d < 30; d++) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - d);
        const w = dayWeights[dt.getDay()];
        for (let i = 0; i < w; i++) dayPool.push(d);
    }
    return dayPool[Math.floor(Math.random() * dayPool.length)];
}

// ─────────────────────────────────────────────────────────────
// Pick two valid stops from route stops (start before end)
// ─────────────────────────────────────────────────────────────
function pickStops(stops) {
    const sIdx = Math.floor(Math.random() * (stops.length - 1));
    const eIdx = sIdx + 1 + Math.floor(Math.random() * (stops.length - 1 - sIdx));
    return { startStop: stops[sIdx], endStop: stops[eIdx] };
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function seedTestBookings() {
    try {
        await sequelize.authenticate();
        const dialect = sequelize.getDialect();
        console.log(`Connected to ${dialect} database.`);

        // 1. Fetch existing schedules with their route stops
        const schedules = await Schedule.findAll({
            include: [{ model: Route, as: 'route' }],
            order: [['id', 'ASC']]
        });

        if (schedules.length === 0) {
            console.error('No schedules found. Run the main seed script first.');
            process.exit(1);
        }
        console.log(`Found ${schedules.length} schedules.`);

        // 2. Fetch passenger users
        const passengers = await User.findAll({ where: { role: 'passenger' } });
        if (passengers.length === 0) {
            console.error('No passenger users found. Create at least one passenger first.');
            process.exit(1);
        }
        console.log(`Found ${passengers.length} passenger users.`);

        // 3. Fetch admin user as fallback passengerId
        const admin = await User.findOne({ where: { role: 'admin' } });

        // 4. Determine booking count (1500-2000)
        const totalBookings = 1500 + Math.floor(Math.random() * 501);
        console.log(`Generating ${totalBookings} test bookings...`);

        const now = new Date();
        const fallbackStops = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Anuradhapura'];

        const bookings = [];

        for (let i = 0; i < totalBookings; i++) {
            // Pick schedule
            const sched = schedules[i % schedules.length];
            const routeStops = sched.route?.stops;
            const stops = Array.isArray(routeStops) && routeStops.length > 1
                ? routeStops
                : fallbackStops;

            // Pick passenger
            const passenger = passengers[i % passengers.length];

            // Pick seat set
            const seats = seatSets[i % seatSets.length];

            // Pick date within last 30 days, weighted by day-of-week
            const dayOffset = pickDayOffset(now);
            const d = new Date(now);
            d.setDate(d.getDate() - dayOffset);

            // Pick hour from weighted pool
            const hour = hourPool[Math.floor(Math.random() * hourPool.length)];
            d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);

            // Pick stops
            const { startStop, endStop } = pickStops(stops);

            // Fare (base fare from schedule × number of seats)
            const fare = sched.fare * seats.length;

            bookings.push({
                passengerId: passenger.id,
                scheduleId: sched.id,
                seatsBooked: seats,
                totalFare: fare,
                status: 'Confirmed',
                paymentStatus: 'Paid',
                startStop,
                endStop,
                createdAt: d,
                updatedAt: d
            });
        }

        // 5. Clear existing bookings and insert in batches
        console.log('Clearing existing bookings...');
        await Booking.destroy({ where: {} });

        console.log('Inserting bookings in batches of 500...');
        for (let i = 0; i < bookings.length; i += 500) {
            const batch = bookings.slice(i, i + 500);
            await Booking.bulkCreate(batch);
            console.log(`  Inserted ${Math.min(i + 500, bookings.length)} / ${bookings.length}`);
        }

        // 6. Print summary
        const finalCount = await Booking.count();
        console.log('\n─── Seed Summary ───');
        console.log(`Total bookings inserted: ${finalCount}`);

        // Quick hour distribution check
        const { Op } = backendRequire('sequelize');
        const hourExpr = dialect === 'postgres'
            ? sequelize.literal(`EXTRACT(HOUR FROM "createdAt")::integer`)
            : sequelize.literal(`HOUR(\`createdAt\`)`);

        const hourlyDist = await Booking.findAll({
            attributes: [
                [hourExpr, 'hour'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { status: 'Confirmed' },
            group: [hourExpr],
            order: [[sequelize.literal('hour'), 'ASC']],
            raw: true
        });

        console.log('\nHourly distribution:');
        const hourLabels = h => h < 12
            ? `${h === 0 ? 12 : h} AM`
            : `${h === 12 ? 12 : h - 12} PM`;
        hourlyDist.forEach(h => {
            const bar = '█'.repeat(Math.round(Number(h.count) / 5));
            console.log(`  ${hourLabels(Number(h.hour)).padEnd(7)} │ ${String(h.count).padStart(4)} ${bar}`);
        });

        // Quick day-of-week check
        const dowExpr = dialect === 'postgres'
            ? sequelize.literal(`EXTRACT(DOW FROM "createdAt")::integer`)
            : sequelize.literal(`(DAYOFWEEK(\`createdAt\`) - 1)`);

        const weeklyDist = await Booking.findAll({
            attributes: [
                [dowExpr, 'dow'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { status: 'Confirmed' },
            group: [dowExpr],
            order: [[sequelize.literal('dow'), 'ASC']],
            raw: true
        });

        console.log('\nDay-of-week distribution:');
        weeklyDist.forEach(d => {
            const bar = '█'.repeat(Math.round(Number(d.count) / 10));
            console.log(`  ${dayNames[Number(d.dow)].padEnd(10)} │ ${String(d.count).padStart(4)} ${bar}`);
        });

        console.log('\n✅ Seed complete. Ready for analytics tests.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seedTestBookings();
