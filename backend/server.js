const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ MySQL Connected Successfully via Sequelize`);
        
        // Use sync({ force: false, alter: true }) to auto-create tables if they don't exist
        await sequelize.sync({ alter: true });
        console.log(`✅ MySQL Database Synced`);
    } catch (error) {
        console.error(`❌ MySQL Connection Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

app.get('/', (req, res) => {
    res.send('Smart Bus System API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});