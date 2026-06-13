const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');

const createBooking = async (req, res) => {
    try {
        const { scheduleId, seatsToBook } = req.body;
        
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        // Check for double booking or broken seats
        let invalidSeat = false;
        let errorMessage = '';
        schedule.seats.forEach(seat => {
            if (seatsToBook.includes(seat.seatNumber)) {
                if (seat.isBooked) {
                    invalidSeat = true;
                    errorMessage = 'One or more selected seats are already booked';
                } else if (seat.isBroken) {
                    invalidSeat = true;
                    errorMessage = 'One or more selected seats are unavailable';
                }
            }
        });

        if (invalidSeat) {
            return res.status(400).json({ message: errorMessage });
        }

        // Update seats
        schedule.seats.forEach(seat => {
            if (seatsToBook.includes(seat.seatNumber)) {
                seat.isBooked = true;
                seat.bookedBy = req.user._id;
            }
        });
        await schedule.save();

        const totalFare = schedule.fare * seatsToBook.length;

        const booking = await Booking.create({
            passenger: req.user._id,
            schedule: scheduleId,
            seatsBooked: seatsToBook,
            totalFare,
            status: 'Confirmed',
            paymentStatus: 'Paid' // Simulated payment
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ passenger: req.user._id })
            .populate({
                path: 'schedule',
                populate: { path: 'bus route' }
            });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('passenger', 'name email')
            .populate({
                path: 'schedule',
                populate: { path: 'bus route' }
            });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createBooking, getMyBookings, getAllBookings };
