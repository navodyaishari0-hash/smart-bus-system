const sequelize = require('../config/database');
const User = require('./User');
const Bus = require('./Bus');
const Route = require('./Route');
const Schedule = require('./Schedule');
const Seat = require('./Seat');
const Booking = require('./Booking');

// Setup Associations
Bus.belongsTo(User, { as: 'conductor', foreignKey: 'conductorId' });

Schedule.belongsTo(Bus, { foreignKey: 'busId', as: 'bus' });
Schedule.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Schedule.hasMany(Seat, { foreignKey: 'scheduleId', as: 'seats' });
Seat.belongsTo(Schedule, { foreignKey: 'scheduleId' });

Seat.belongsTo(User, { as: 'bookedBy', foreignKey: 'bookedById' });

Booking.belongsTo(User, { as: 'passenger', foreignKey: 'passengerId' });
Booking.belongsTo(Schedule, { as: 'schedule', foreignKey: 'scheduleId' });

module.exports = {
    sequelize,
    User,
    Bus,
    Route,
    Schedule,
    Seat,
    Booking
};
