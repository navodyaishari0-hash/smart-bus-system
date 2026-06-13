const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');

const getSchedules = async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        // In a real app, we would query the Route model to find route IDs matching origin/destination
        // For simplicity, we just return all or filter if provided exactly
        const schedules = await Schedule.find()
            .populate('bus')
            .populate('route');
            
        // Filter out schedules where the bus is not active
        const activeSchedules = schedules.filter(schedule => schedule.bus && schedule.bus.status === 'Active');
        
        res.json(activeSchedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getScheduleById = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('bus')
            .populate('route');
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addSchedule = async (req, res) => {
    try {
        const { bus, route, departureDate, departureTime, fare } = req.body;
        
        const busDetails = await Bus.findById(bus);
        if (!busDetails) return res.status(404).json({ message: 'Bus not found' });

        // Generate seats based on bus capacity
        const seats = [];
        for (let i = 1; i <= busDetails.capacity; i++) {
            seats.push({ seatNumber: `S${i}`, isBooked: false, bookedBy: null });
        }

        const schedule = await Schedule.create({
            bus,
            route,
            departureDate,
            departureTime,
            fare,
            seats
        });

        res.status(201).json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleSeatStatus = async (req, res) => {
    try {
        const { id, seatId } = req.params;
        const schedule = await Schedule.findById(id);
        
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        const seat = schedule.seats.id(seatId);
        if (!seat) {
            return res.status(404).json({ message: 'Seat not found' });
        }

        if (!seat.isBooked && !seat.isBroken) {
            // Available -> Booked
            seat.isBooked = true;
            seat.isBroken = false;
        } else if (seat.isBooked) {
            // Booked -> Broken
            seat.isBooked = false;
            seat.bookedBy = null;
            seat.isBroken = true;
        } else if (seat.isBroken) {
            // Broken -> Available
            seat.isBooked = false;
            seat.isBroken = false;
        }

        await schedule.save();
        res.json({ message: 'Seat status updated', seat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSchedules, getScheduleById, addSchedule, toggleSeatStatus };
