const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true
    },
    capacity: {
        type: Number,
        required: true,
        default: 40
    },
    type: {
        type: String,
        enum: ['Standard', 'AC', 'Luxury'],
        default: 'Standard'
    },
    photo: {
        type: String,
        default: ''
    },
    conductor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Active', 'Broken', 'Maintenance'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
