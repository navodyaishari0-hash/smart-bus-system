const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
    origin: (origin, cb) => {
        // Allow requests with no origin (server-to-server, mobile apps, curl)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, true); // In production behind Render, keep open for flexibility
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
};

const io = new Server(server, { cors: corsOptions });

app.set('io', io);

// Middleware: attach io instance to every request so controllers can use req.io
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Database Connected Successfully via Sequelize`);
        await sequelize.sync({ alter: true });
        console.log(`Database Synced`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/conductor', require('./routes/conductorRoutes'));

app.get('/', (req, res) => {
    res.send('Smart Bus System API is running...');
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    console.error(err.stack);
    if (!res.headersSent) {
        res.status(err.status || 500).json({
            message: err.message || 'Internal Server Error'
        });
    }
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.timeout = 120000;
