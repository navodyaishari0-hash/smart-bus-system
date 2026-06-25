const { Booking, Schedule, Seat, User, Bus, Route } = require('../models');

const formatBooking = (booking) => {
    const b = booking.toJSON();
    b._id = b.id;
    // Ensure seatsBooked is always an array (Sequelize JSON can return string)
    if (typeof b.seatsBooked === 'string') {
        try { b.seatsBooked = JSON.parse(b.seatsBooked); } catch (e) { b.seatsBooked = []; }
    }
    if (!Array.isArray(b.seatsBooked)) b.seatsBooked = [];
    if (b.passenger) {
        b.passenger._id = b.passenger.id;
    }
    if (b.schedule) {
        b.schedule._id = b.schedule.id;
        if (b.schedule.bus) b.schedule.bus._id = b.schedule.bus.id;
        if (b.schedule.route) b.schedule.route._id = b.schedule.route.id;
    }
    return b;
};

const createBooking = async (req, res) => {
    try {
        const { scheduleId, seatsToBook, startStop, endStop } = req.body;
        
        const schedule = await Schedule.findByPk(scheduleId, {
            include: [
                { model: Seat, as: 'seats' },
                { model: Route, as: 'route' }
            ]
        });
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        if (!startStop || !endStop) {
            return res.status(400).json({ message: 'Start and end stops must be provided' });
        }

        const startIndex = schedule.route.stops.indexOf(startStop);
        const endIndex = schedule.route.stops.indexOf(endStop);

        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            return res.status(400).json({ message: 'Invalid segment requested' });
        }

        // Check for double booking or broken seats for this segment
        let invalidSeat = false;
        let errorMessage = '';
        const seatsToUpdate = [];
        
        schedule.seats.forEach(seat => {
            if (seatsToBook.includes(seat.seatNumber)) {
                if (seat.isBroken) {
                    invalidSeat = true;
                    errorMessage = 'One or more selected seats are unavailable';
                } else {
                    // Check overlap
                    let overlap = false;
                    const segments = seat.bookedSegments || [];
                    for (const seg of segments) {
                        const overlapStart = Math.max(startIndex, seg.start);
                        const overlapEnd = Math.min(endIndex, seg.end);
                        if (overlapStart < overlapEnd) {
                            overlap = true;
                            break;
                        }
                    }
                    if (overlap) {
                        invalidSeat = true;
                        errorMessage = 'One or more selected seats are already booked for this segment';
                    } else {
                        seatsToUpdate.push(seat);
                    }
                }
            }
        });

        if (invalidSeat || seatsToUpdate.length !== seatsToBook.length) {
            return res.status(400).json({ message: errorMessage || 'Invalid seat selection' });
        }

        // Update seats
        for (const seat of seatsToUpdate) {
            const currentSegments = seat.bookedSegments || [];
            currentSegments.push({ start: startIndex, end: endIndex, startStop, endStop });
            seat.bookedSegments = currentSegments;
            seat.bookedById = req.user.id;
            
            // Sequelize JSON trick to detect array push
            seat.changed('bookedSegments', true);
            await seat.save();
        }

        const totalFare = schedule.fare * seatsToBook.length; // You can make this dynamic based on distance later!

        const booking = await Booking.create({
            passengerId: req.user.id,
            scheduleId: scheduleId,
            seatsBooked: seatsToBook,
            totalFare,
            status: 'Confirmed',
            paymentStatus: 'Paid',
            startStop,
            endStop
        });

        // Real-time notification via Socket.IO
        try {
            const passenger = await User.findByPk(req.user.id, { attributes: ['name', 'email'] });
            const bus = await Bus.findByPk(schedule.busId);
            const bookingData = {
                message: `New booking from ${passenger?.name || 'A passenger'} for Bus ${bus?.busNumber || schedule.busId}!`,
                booking: {
                    passenger: passenger ? { name: passenger.name, email: passenger.email } : { email: req.user.email },
                    busNumber: bus?.busNumber,
                    routeName: schedule.route?.name,
                    seats: seatsToBook,
                    totalFare,
                    startStop,
                    endStop,
                    time: new Date().toISOString()
                }
            };
            req.io.emit('newBookingAlert', bookingData);
        } catch (e) {
            console.error('Socket emit error:', e.message);
        }

        // Twilio SMS Integration
        let passengerPhone = req.body.passengerDetails?.phone || req.user.phone || '+94 77 000 0000';
        // Ensure phone starts with '+'
        if (!passengerPhone.startsWith('+')) {
            // Assume Sri Lanka +94 if no country code provided and it starts with 0
            passengerPhone = passengerPhone.startsWith('0') 
                ? '+94' + passengerPhone.substring(1) 
                : '+' + passengerPhone;
        }

        const smsMessage = `SmartBus: Your booking is confirmed! Route: ${schedule.route?.name || 'Your journey'}. Seats: ${seatsToBook.join(', ')}. Fare: Rs. ${totalFare}. Have a safe trip!`;
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && accountSid !== 'your_account_sid_here') {
            try {
                const twilio = require('twilio');
                const client = new twilio(accountSid, authToken);
                const message = await client.messages.create({
                    body: smsMessage,
                    from: twilioPhone,
                    to: passengerPhone
                });
                console.log(`✅ SMS sent successfully to ${passengerPhone}. Message SID: ${message.sid}`);
            } catch (smsError) {
                console.error(`❌ Failed to send SMS via Twilio:`, smsError.message);
                // We don't throw an error here because the booking was already successful
            }
        } else {
            console.log(`\n================= SMS NOTIFICATION (MOCK) =================`);
            console.log(`To: ${passengerPhone}`);
            console.log(`Message: ${smsMessage}`);
            console.log(`(Twilio keys not configured in .env. Real SMS was not sent.)`);
            console.log(`===========================================================\n`);
        }

        res.status(201).json(formatBooking(booking));
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            where: { passengerId: req.user.id },
            include: [
                {
                    model: Schedule,
                    as: 'schedule',
                    include: [
                        { model: Bus, as: 'bus' },
                        { model: Route, as: 'route' }
                    ]
                }
            ]
        });
        res.json(bookings.map(formatBooking));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            include: [
                { model: User, as: 'passenger', attributes: ['id', 'name', 'email'] },
                {
                    model: Schedule,
                    as: 'schedule',
                    include: [
                        { model: Bus, as: 'bus' },
                        { model: Route, as: 'route' }
                    ]
                }
            ]
        });
        res.json(bookings.map(formatBooking));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createBooking, getMyBookings, getAllBookings };
