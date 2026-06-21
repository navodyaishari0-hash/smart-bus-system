const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Seat = sequelize.define('Seat', {
    seatNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bookedSegments: {
        type: DataTypes.JSON, // Stores array of objects like [{ startStop: "Colombo", endStop: "Kegalle" }]
        allowNull: false,
        defaultValue: [],
        get() {
            const rawValue = this.getDataValue('bookedSegments');
            if (typeof rawValue === 'string') {
                try {
                    return JSON.parse(rawValue);
                } catch (e) {
                    return rawValue;
                }
            }
            return rawValue || [];
        }
    },
    isBroken: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.getDataValue('isBroken')) return 'Broken';
            const segments = this.getDataValue('bookedSegments');
            if (Array.isArray(segments) && segments.length > 0) return 'Booked';
            if (typeof segments === 'string') {
                try {
                    const parsed = JSON.parse(segments);
                    if (Array.isArray(parsed) && parsed.length > 0) return 'Booked';
                } catch (e) {}
            }
            return 'Available';
        }
    }
    // scheduleId and bookedById will be added via associations in index.js
}, {
    timestamps: true
});

module.exports = Seat;
