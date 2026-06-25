const { Bus, Schedule, Route, Seat } = require('../models');

const getMySchedules = async (req, res) => {
    try {
        const bus = await Bus.findOne({
            where: { conductorId: req.user.id }
        });

        if (!bus) {
            return res.json([]);
        }

        const schedules = await Schedule.findAll({
            where: { busId: bus.id },
            include: [
                { model: Bus, as: 'bus' },
                { model: Route, as: 'route' },
                { model: Seat, as: 'seats' }
            ],
            order: [['departureDate', 'ASC'], ['departureTime', 'ASC']]
        });

        const result = schedules.map(s => {
            const sched = s.toJSON();
            sched._id = sched.id;
            if (sched.bus) sched.bus._id = sched.bus.id;
            if (sched.route) sched.route._id = sched.route.id;
            if (sched.seats) {
                sched.seats = sched.seats.map(seat => ({
                    ...seat,
                    _id: seat.id,
                    isBooked: Array.isArray(seat.bookedSegments) && seat.bookedSegments.length > 0
                }));
            }
            return sched;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMySchedules };
