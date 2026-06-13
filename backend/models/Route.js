const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    origin: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    distance: {
        type: Number, // in km
        required: true
    },
    estimatedDuration: {
        type: String, // e.g. "3 hours"
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
