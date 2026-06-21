const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    seatsBooked: {
        type: DataTypes.JSON,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('seatsBooked');
            if (typeof rawValue === 'string') {
                try { return JSON.parse(rawValue); } catch (e) { return rawValue; }
            }
            return Array.isArray(rawValue) ? rawValue : [];
        }
    },
    totalFare: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Confirmed', 'Cancelled'),
        defaultValue: 'Confirmed'
    },
    paymentStatus: {
        type: DataTypes.ENUM('Unpaid', 'Paid'),
        defaultValue: 'Paid'
    },
    startStop: {
        type: DataTypes.STRING,
        allowNull: false
    },
    endStop: {
        type: DataTypes.STRING,
        allowNull: false
    }
    // passengerId and scheduleId will be added via associations in index.js
}, {
    timestamps: true
});

module.exports = Booking;
