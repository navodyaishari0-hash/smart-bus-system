const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bus = sequelize.define('Bus', {
    busNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40
    },
    type: {
        type: DataTypes.ENUM('Standard', 'AC', 'Luxury'),
        defaultValue: 'Standard'
    },
    photo: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    status: {
        type: DataTypes.ENUM('Active', 'Broken', 'Maintenance'),
        defaultValue: 'Active'
    }
    // conductorId will be added via association in index.js
}, {
    timestamps: true
});

module.exports = Bus;
