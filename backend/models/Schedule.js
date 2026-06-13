const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seatNumber: {
        type: String,
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    isBroken: {
        type: Boolean,
        default: false
    },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

const scheduleSchema = new mongoose.Schema({
    bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    departureDate: {
        type: Date,
        required: true
    },
    departureTime: {
        type: String, // e.g., "08:00 AM"
        required: true
    },
    fare: {
        type: Number,
        required: true
    },
    seats: [seatSchema]
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
