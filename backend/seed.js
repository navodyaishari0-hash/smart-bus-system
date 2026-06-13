const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Schedule = require('./models/Schedule');

dotenv.config();

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // Clear existing data
        await User.deleteMany();
        await Bus.deleteMany();
        await Route.deleteMany();
        await Schedule.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Create Admin
        const admin = await User.create({
            name: 'Super Admin',
            email: 'admin@smartbus.com',
            password: hashedPassword,
            role: 'admin'
        });

        // Create Conductor
        const conductor = await User.create({
            name: 'John Conductor',
            email: 'conductor@smartbus.com',
            password: hashedPassword,
            role: 'conductor'
        });

        // Create Passenger
        const passenger = await User.create({
            name: 'Alice Passenger',
            email: 'alice@example.com',
            password: hashedPassword,
            role: 'passenger'
        });

        // Create Route
        const route = await Route.create({
            name: 'Colombo to Kandy (Express)',
            origin: 'Colombo',
            destination: 'Kandy',
            distance: 115,
            estimatedDuration: '3 hours'
        });

        // Create multiple Buses and Schedules (10 buses)
        const busTemplates = [
            { busNumber: 'WP-ND-1001', capacity: 40, type: 'AC', photo: 'https://images.unsplash.com/photo-1542367597-3a6b6f1fd6b7?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
            { busNumber: 'WP-ND-1002', capacity: 40, type: 'AC', photo: 'https://images.unsplash.com/photo-1520790166724-6b5c5f25f7b1?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=2' },
            { busNumber: 'WP-ND-1003', capacity: 30, type: 'Standard', photo: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3' },
            { busNumber: 'WP-ND-1004', capacity: 30, type: 'Luxury', photo: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=4' },
            { busNumber: 'WP-ND-1005', capacity: 50, type: 'AC', photo: 'https://images.unsplash.com/photo-1533729158031-5c0b8e5c7d9a?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=5' },
            { busNumber: 'WP-ND-1006', capacity: 45, type: 'AC', photo: 'https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=6' },
            { busNumber: 'WP-ND-1007', capacity: 40, type: 'Standard', photo: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=7' },
            { busNumber: 'WP-ND-1008', capacity: 35, type: 'AC', photo: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=8' },
            { busNumber: 'WP-ND-1009', capacity: 28, type: 'Luxury', photo: 'https://images.unsplash.com/photo-1497493292307-31c376b6e479?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=9' },
            { busNumber: 'WP-ND-1010', capacity: 32, type: 'AC', photo: 'https://images.unsplash.com/photo-1510936111840-2e2f2f35d7f3?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=10' }
        ];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Staggered departure times for variety
        const departureTimes = ['06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM'];

        for (let i = 0; i < busTemplates.length; i++) {
            const b = busTemplates[i];
            const createdBus = await Bus.create({
                busNumber: b.busNumber,
                capacity: b.capacity,
                type: b.type,
                conductor: conductor._id,
                photo: b.photo || ''
            });

            // Generate seats for this bus
            const seats = [];
            for (let s = 1; s <= createdBus.capacity; s++) {
                seats.push({ seatNumber: `S${s}`, isBooked: false, bookedBy: null });
            }

            // Create Schedule for each bus
            await Schedule.create({
                bus: createdBus._id,
                route: route._id,
                departureDate: tomorrow,
                departureTime: departureTimes[i] || '08:00 AM',
                fare: 1500 + (i * 50),
                seats: seats
            });
        }

        console.log('Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedDB();
