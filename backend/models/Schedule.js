const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Schedule = sequelize.define('Schedule', {
    departureDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    departureTime: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fare: {
        type: DataTypes.FLOAT,
        allowNull: false
    }
    // busId and routeId will be added via associations in index.js
}, {
    timestamps: true
});

module.exports = Schedule;
