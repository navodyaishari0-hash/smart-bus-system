const { Schedule, Bus, Route, Seat, Booking } = require('../models');

const formatSchedule = (schedule, reqOrigin = null, reqDest = null) => {
    const s = schedule.toJSON();
    s._id = s.id;
    if (s.bus) {
        s.bus._id = s.bus.id;
        s.bus.conductor = s.bus.conductorId; // Frontend checks schedule.bus.conductor
    }
    if (s.route) s.route._id = s.route.id;
    
    // Determine the requested segment indices
    let reqStartIndex = -1;
    let reqEndIndex = -1;
    if (reqOrigin && reqDest && s.route && s.route.stops) {
        reqStartIndex = s.route.stops.indexOf(reqOrigin);
        reqEndIndex = s.route.stops.indexOf(reqDest);
    }

    if (s.seats) {
        s.seats = s.seats.map(seat => {
            seat._id = seat.id;
            
            // Check for overlaps in bookedSegments
            let isOverlapping = false;
            if (reqStartIndex !== -1 && reqEndIndex !== -1 && seat.bookedSegments && seat.bookedSegments.length > 0) {
                for (const segment of seat.bookedSegments) {
                    // Overlap happens if Max(reqStart, segment.start) < Min(reqEnd, segment.end)
                    const overlapStart = Math.max(reqStartIndex, segment.start);
                    const overlapEnd = Math.min(reqEndIndex, segment.end);
                    if (overlapStart < overlapEnd) {
                        isOverlapping = true;
                        break;
                    }
                }
            } else if (seat.bookedSegments && seat.bookedSegments.length > 0 && (reqStartIndex === -1 || reqEndIndex === -1)) {
                // If they didn't search a specific segment, assume booked if it has ANY segments
                isOverlapping = true;
            }

            seat.isBooked = isOverlapping;
            return seat;
        });
    }
    return s;
};

const getSchedules = async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        const isSearch = Object.keys(req.query).length > 0;

        // Build Sequelize query - filter at DB level where possible
        const whereClause = {};
        if (date) {
            whereClause.departureDate = date;
        }

        const includeClause = [
            { model: Bus, as: 'bus' },
            { model: Route, as: 'route' },
            { model: Seat, as: 'seats' }
        ];

        const schedules = await Schedule.findAll({
            where: whereClause,
            include: includeClause
        });
            
        // Apply in-memory filtering for route stop indices (can't do at DB level with JSON)
        let filteredSchedules = schedules;

        if (isSearch) {
            filteredSchedules = schedules.filter(schedule => {
                const isActive = schedule.bus && schedule.bus.status === 'Active';
                let matchOriginDest = true;
                if (origin && destination) {
                    if (schedule.route && schedule.route.stops) {
                        const originIndex = schedule.route.stops.indexOf(origin);
                        const destIndex = schedule.route.stops.indexOf(destination);
                        matchOriginDest = originIndex !== -1 && destIndex !== -1 && originIndex < destIndex;
                    } else {
                        matchOriginDest = false;
                    }
                } else if (origin) {
                    matchOriginDest = schedule.route && schedule.route.stops && schedule.route.stops.includes(origin);
                } else if (destination) {
                    matchOriginDest = schedule.route && schedule.route.stops && schedule.route.stops.includes(destination);
                }
                
                return isActive && matchOriginDest;
            });
        }
        
        res.json(filteredSchedules.map(sch => formatSchedule(sch, origin, destination)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getScheduleById = async (req, res) => {
    try {
        const schedule = await Schedule.findByPk(req.params.id, {
            include: [
                { model: Bus, as: 'bus' },
                { model: Route, as: 'route' },
                { model: Seat, as: 'seats' }
            ]
        });
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }
        
        const { origin, destination } = req.query;
        res.json(formatSchedule(schedule, origin, destination));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addSchedule = async (req, res) => {
    try {
        const { bus, route, departureDate, departureTime, fare } = req.body;
        
        const busDetails = await Bus.findByPk(bus);
        if (!busDetails) return res.status(404).json({ message: 'Bus not found' });

        const schedule = await Schedule.create({
            busId: bus,
            routeId: route,
            departureDate,
            departureTime,
            fare
        });

        // Generate seats based on bus capacity
        const seatPromises = [];
        for (let i = 1; i <= busDetails.capacity; i++) {
            seatPromises.push(Seat.create({
                seatNumber: `S${i}`,
                isBooked: false,
                isBroken: false,
                scheduleId: schedule.id
            }));
        }
        await Promise.all(seatPromises);

        const newSchedule = await Schedule.findByPk(schedule.id, {
            include: [{ model: Seat, as: 'seats' }]
        });

        res.status(201).json(formatSchedule(newSchedule));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getScheduleSeats = async (req, res) => {
    try {
        const seats = await Seat.findAll({
            where: { scheduleId: req.params.id },
            attributes: { exclude: ['scheduleId'] }
        });
        const formatted = seats.map(s => {
            const seat = s.toJSON();
            seat._id = seat.id;
            return seat;
        });
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleSeatStatus = async (req, res) => {
    try {
        const { id, seatId } = req.params;
        
        const seat = await Seat.findOne({ where: { id: seatId, scheduleId: id } });
        if (!seat) {
            return res.status(404).json({ message: 'Seat not found' });
        }

        if ((!seat.bookedSegments || seat.bookedSegments.length === 0) && !seat.isBroken) {
            // Available -> Booked (for the entire journey)
            const schedule = await Schedule.findByPk(id, { include: [{ model: Route, as: 'route' }] });
            if (schedule && schedule.route && schedule.route.stops) {
                seat.bookedSegments = [{
                    start: 0,
                    end: schedule.route.stops.length - 1,
                    startStop: schedule.route.stops[0],
                    endStop: schedule.route.stops[schedule.route.stops.length - 1]
                }];
                seat.changed('bookedSegments', true);
            }
            seat.isBroken = false;
        } else if (seat.bookedSegments && seat.bookedSegments.length > 0) {
            // Booked -> Broken — also cancel related passenger bookings
            const relatedBookings = await Booking.findAll({
                where: { scheduleId: id, status: 'Confirmed' }
            });
            for (const booking of relatedBookings) {
                const seats = Array.isArray(booking.seatsBooked) ? booking.seatsBooked : [];
                if (seats.includes(seat.seatNumber)) {
                    booking.status = 'Cancelled';
                    await booking.save();
                }
            }
            seat.bookedSegments = [];
            seat.changed('bookedSegments', true);
            seat.bookedById = null;
            seat.isBroken = true;
        } else if (seat.isBroken) {
            // Broken -> Available
            seat.bookedSegments = [];
            seat.changed('bookedSegments', true);
            seat.isBroken = false;
        }

        await seat.save();
        res.json({ message: 'Seat status updated', seat: { ...seat.toJSON(), _id: seat.id } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSchedules, getScheduleById, getScheduleSeats, addSchedule, toggleSeatStatus };
