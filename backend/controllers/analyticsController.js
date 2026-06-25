const { sequelize, Booking, Seat, Schedule, Bus, Route, User } = require('../models');
const { Op } = require('sequelize');

const dialect = sequelize.getDialect();
const isPG = dialect === 'postgres';

const q = (s) => isPG ? `"${s}"` : `\`${s}\``;

function categorizeSeatNumber(seatNum) {
    const n = parseInt(seatNum.replace(/^S/i, ''), 10);
    if (isNaN(n)) return { position: 'Unknown', zone: 'Unknown' };
    const col = (n - 1) % 4;
    const row = Math.floor((n - 1) / 4);
    return {
        position: col === 0 || col === 3 ? 'Window' : 'Aisle',
        zone: row < 3 ? 'Front' : row < 7 ? 'Middle' : 'Back'
    };
}

const getBookingTrends = async (req, res) => {
    try {
        const whereClause = { status: 'Confirmed' };

        const hourExpr = isPG
            ? sequelize.literal(`EXTRACT(HOUR FROM ${q('createdAt')})::integer`)
            : sequelize.literal(`HOUR(${q('createdAt')})`);

        const hourly = await Booking.findAll({
            attributes: [
                [hourExpr, 'hour'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: [hourExpr],
            order: [[sequelize.literal('hour'), 'ASC']],
            raw: true
        });

        const hourlyMap = {};
        hourly.forEach(h => { hourlyMap[Number(h.hour)] = Number(h.count); });
        const hourlyFull = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            label: i < 12 ? `${i === 0 ? 12 : i} AM` : `${i === 12 ? 12 : i - 12} PM`,
            count: hourlyMap[i] || 0
        }));

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const dowExpr = isPG
            ? sequelize.literal(`EXTRACT(DOW FROM ${q('createdAt')})::integer`)
            : sequelize.literal(`(DAYOFWEEK(${q('createdAt')}) - 1)`);

        const weekly = await Booking.findAll({
            attributes: [
                [dowExpr, 'dow'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: [dowExpr],
            order: [[sequelize.literal('dow'), 'ASC']],
            raw: true
        });

        const weeklyMap = {};
        weekly.forEach(d => { weeklyMap[Number(d.dow)] = Number(d.count); });
        const weeklyFull = dayNames.map((name, i) => ({
            dow: i,
            day: name,
            count: weeklyMap[i] || 0
        }));

        const routePop = await Booking.findAll({
            attributes: [
                [sequelize.col('schedule.route.id'), 'routeId'],
                [sequelize.col('schedule.route.name'), 'routeName'],
                [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'count']
            ],
            include: [{
                model: Schedule,
                as: 'schedule',
                attributes: [],
                include: [{ model: Route, as: 'route', attributes: [] }]
            }],
            where: whereClause,
            group: ['schedule.route.id', 'schedule.route.name'],
            order: [[sequelize.literal('count'), 'DESC']],
            raw: true
        });

        res.json({ hourly: hourlyFull, weekly: weeklyFull, routePopularity: routePop });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSeatPreference = async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            attributes: ['seatsBooked'],
            where: { status: 'Confirmed' },
            limit: 10000
        });

        let totalBookings = 0;
        const positionCounts = { Window: 0, Aisle: 0, Unknown: 0 };
        const zoneCounts = { Front: 0, Middle: 0, Back: 0, Unknown: 0 };
        const seatNumberPopularity = {};

        bookings.forEach(booking => {
            const seats = booking.seatsBooked;
            if (!Array.isArray(seats) || seats.length === 0) return;

            seats.forEach(seatNum => {
                totalBookings++;
                const { position, zone } = categorizeSeatNumber(seatNum);
                positionCounts[position] = (positionCounts[position] || 0) + 1;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                seatNumberPopularity[seatNum] = (seatNumberPopularity[seatNum] || 0) + 1;
            });
        });

        const seatRanking = Object.entries(seatNumberPopularity)
            .map(([seatNumber, count]) => ({ seatNumber, count, ...categorizeSeatNumber(seatNumber) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const toPct = (obj) => {
            const pct = {};
            Object.keys(obj).forEach(k => {
                pct[k] = totalBookings > 0 ? Math.round((obj[k] / totalBookings) * 100) : 0;
            });
            return pct;
        };

        res.json({
            totalBookings,
            position: {
                labels: Object.keys(positionCounts),
                values: Object.values(positionCounts),
                percent: toPct(positionCounts)
            },
            zone: {
                labels: Object.keys(zoneCounts),
                values: Object.values(zoneCounts),
                percent: toPct(zoneCounts)
            },
            seatRanking
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateDemo = async (req, res) => {
    try {
        await Booking.destroy({ where: {} });

        const schedules = await Schedule.findAll({
            include: [{ model: Route, as: 'route' }],
            limit: 30,
            order: sequelize.random()
        });

        if (schedules.length === 0) {
            return res.status(400).json({ message: 'No schedules found. Seed schedules first.' });
        }

        let passengers = await User.findAll({ where: { role: 'passenger' } });
        if (passengers.length === 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hp = await bcrypt.hash('password123', salt);
            passengers = await User.bulkCreate([
                { name: 'Alice', email: 'alice@test.com', password: hp, role: 'passenger' },
                { name: 'Bob', email: 'bob@test.com', password: hp, role: 'passenger' },
                { name: 'Charlie', email: 'charlie@test.com', password: hp, role: 'passenger' },
                { name: 'Diana', email: 'diana@test.com', password: hp, role: 'passenger' },
                { name: 'Eve', email: 'eve@test.com', password: hp, role: 'passenger' }
            ]);
        }

        const now = new Date();
        const seatSets = [
            ['S1', 'S2'], ['S4', 'S5'], ['S8'], ['S12', 'S13', 'S14'],
            ['S3'], ['S7', 'S8'], ['S10'], ['S15', 'S16'],
            ['S20', 'S21', 'S22'], ['S25'], ['S30', 'S31'], ['S35'],
            ['S2', 'S3', 'S4'], ['S6'], ['S9', 'S10'], ['S18', 'S19'],
            ['S11'], ['S14', 'S15'], ['S17'], ['S23', 'S24'],
            ['S27', 'S28'], ['S33'], ['S36', 'S37'], ['S39', 'S40']
        ];

        const hoursDist = [
            6,6,7,7,7,8,8,8,8,9,9,9,9,9,
            10,10,10,11,11,12,12,13,13,14,14,14,
            15,15,15,16,16,16,16,17,17,17,17,17,18,18,18,18,
            19,19,19,20,20,21,22
        ];

        const dayWeights = [5, 3, 3, 3, 3, 5, 4];

        const allStops = ['Colombo','Kandy','Galle','Jaffna','Negombo',
            'Anuradhapura','Kurunegala','Nuwara Eliya','Matara','Badulla',
            'Trincomalee','Batticaloa','Kalutara','Dambulla','Kegalle',
            'Ratnapura','Chilaw','Puttalam','Vavuniya','Gampola'];

        const totalRecords = 1500 + Math.floor(Math.random() * 501);
        const bookings = [];

        for (let i = 0; i < totalRecords; i++) {
            const sched = schedules[i % schedules.length];
            const stops = sched.route?.stops || allStops;
            const sIdx = Math.floor(Math.random() * (stops.length - 1));
            const eIdx = sIdx + 1 + Math.floor(Math.random() * (stops.length - 1 - sIdx));
            const seats = seatSets[i % seatSets.length];
            const p = passengers[i % passengers.length];

            const d = new Date(now);
            d.setDate(d.getDate() - Math.floor(Math.random() * 30));
            d.setHours(hoursDist[i % hoursDist.length], Math.floor(Math.random() * 60), 0, 0);

            const dayWeight = dayWeights[d.getDay()];
            if (Math.random() * 5 > dayWeight) {
                d.setDate(d.getDate() - 1);
            }

            bookings.push({
                passengerId: p.id,
                scheduleId: sched.id,
                seatsBooked: seats,
                totalFare: sched.fare * seats.length,
                status: 'Confirmed',
                paymentStatus: 'Paid',
                startStop: stops[sIdx],
                endStop: stops[eIdx],
                createdAt: d,
                updatedAt: d
            });
        }

        for (let i = 0; i < bookings.length; i += 500) {
            await Booking.bulkCreate(bookings.slice(i, i + 500));
        }

        res.json({
            message: `Generated ${bookings.length} demo bookings across ${schedules.length} schedules and ${passengers.length} passengers.`,
            count: bookings.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBookingTrends, getSeatPreference, generateDemo };
