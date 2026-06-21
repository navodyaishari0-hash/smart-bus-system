const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    stops: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        get() {
            const rawValue = this.getDataValue('stops');
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
    startLocation: {
        type: DataTypes.VIRTUAL,
        get() {
            const stops = this.getDataValue('stops');
            if (Array.isArray(stops) && stops.length > 0) return stops[0];
            if (typeof stops === 'string') {
                try {
                    const parsed = JSON.parse(stops);
                    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
                } catch (e) { return null; }
            }
            return null;
        }
    },
    endLocation: {
        type: DataTypes.VIRTUAL,
        get() {
            const stops = this.getDataValue('stops');
            if (Array.isArray(stops) && stops.length > 0) return stops[stops.length - 1];
            if (typeof stops === 'string') {
                try {
                    const parsed = JSON.parse(stops);
                    return Array.isArray(parsed) && parsed.length > 0 ? parsed[parsed.length - 1] : null;
                } catch (e) { return null; }
            }
            return null;
        }
    },
    distance: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    estimatedDuration: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = Route;
