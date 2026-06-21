const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { sequelize, User, Bus, Route, Schedule, Seat } = require('./models');

dotenv.config();

const seedDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected for Seeding');

        // Drop and recreate all tables
        await sequelize.sync({ force: true });
        console.log('Database tables recreated.');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Create Admin
        const admin = await User.create({
            name: 'Super Admin',
            email: 'admin@smartbus.com',
            password: hashedPassword,
            role: 'admin'
        });

        // (The conductor loop was moved down to match totalBuses)

        // Create Passenger
        const passenger = await User.create({
            name: 'Alice Passenger',
            email: 'alice@example.com',
            password: hashedPassword,
            role: 'passenger'
        });

        // Pre-defined realistic Sri Lankan routes
        const routeData = [
            {
                name: 'Colombo to Kandy (A1)',
                stops: ['Colombo', 'Kadawatha', 'Nittambuwa', 'Kegalle', 'Peradeniya', 'Kandy'],
                distance: 115,
                estimatedDuration: '3 hours'
            },
            {
                name: 'Colombo to Galle',
                stops: ['Colombo', 'Panadura', 'Kalutara', 'Aluthgama', 'Hikkaduwa', 'Galle'],
                distance: 128,
                estimatedDuration: '2.5 hours'
            },
            {
                name: 'Negombo to Colombo',
                stops: ['Negombo', 'Kochchikade', 'Ja-Ela', 'Kadawatha', 'Colombo'],
                distance: 45,
                estimatedDuration: '1.5 hours'
            },
            {
                name: 'Ratnapura to Colombo',
                stops: ['Ratnapura', 'Pelmadulla', 'Balangoda', 'Avissawella', 'Colombo'],
                distance: 100,
                estimatedDuration: '3 hours'
            },
            {
                name: 'Colombo to Jaffna (A9)',
                stops: ['Colombo', 'Kurunegala', 'Dambulla', 'Anuradhapura', 'Vavuniya', 'Kilinochchi', 'Jaffna'],
                distance: 395,
                estimatedDuration: '8 hours'
            },
            {
                name: 'Colombo to Kataragama',
                stops: ['Colombo', 'Panadura', 'Kalutara', 'Galle', 'Matara', 'Tangalle', 'Kataragama'],
                distance: 280,
                estimatedDuration: '5 hours'
            },
            {
                name: 'Colombo to Badulla (A4)',
                stops: ['Colombo', 'Avissawella', 'Ratnapura', 'Pelmadulla', 'Balangoda', 'Badulla'],
                distance: 230,
                estimatedDuration: '6 hours'
            },
            {
                name: 'Kandy to Badulla',
                stops: ['Kandy', 'Gampola', 'Nuwara Eliya', 'Welimada', 'Badulla'],
                distance: 120,
                estimatedDuration: '4 hours'
            },
            {
                name: 'Colombo to Trincomalee',
                stops: ['Colombo', 'Kurunegala', 'Dambulla', 'Habarana', 'Kantale', 'Trincomalee'],
                distance: 265,
                estimatedDuration: '6 hours'
            }
        ];

        const routeTemplates = routeData.map(r => ({
            name: r.name,
            stops: r.stops,
            distance: r.distance,
            estimatedDuration: r.estimatedDuration
        }));

        const createdRoutes = await Route.bulkCreate(routeTemplates, { returning: true });

        // Generate 450 Conductors and Buses (5 buses per route × 9 routes = 45 used in schedules)
        const totalBuses = 450;
        const conductors = [];
        for (let i = 1; i <= totalBuses; i++) {
            const conductorPassword = await bcrypt.hash(`conductor${i}pass`, salt);
            conductors.push({
                name: `Conductor ${i}`,
                email: `conductor${i}@smartbus.com`,
                password: conductorPassword,
                role: 'conductor',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        const createdConductors = await User.bulkCreate(conductors, { returning: true });

        const busTypes = ['AC', 'Standard', 'Luxury'];
        const busPhotos = [
            'https://images.unsplash.com/photo-1542367597-3a6b6f1fd6b7?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1520790166724-6b5c5f25f7b1?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop'
        ];

        const busesToCreate = [];
        for (let i = 0; i < totalBuses; i++) {
            busesToCreate.push({
                busNumber: `WP-ND-${1000 + i}`,
                capacity: 40,
                type: busTypes[i % busTypes.length],
                conductorId: createdConductors[i].id,
                photo: busPhotos[i % busPhotos.length],
                status: 'Active',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        const createdBuses = await Bus.bulkCreate(busesToCreate, { returning: true });

        // Generate Schedules for Today, Tomorrow, and Day After
        const datesToSchedule = [new Date(), new Date(), new Date()];
        datesToSchedule[1].setDate(datesToSchedule[1].getDate() + 1);
        datesToSchedule[2].setDate(datesToSchedule[2].getDate() + 2);

        const departureTimes = ['06:00 AM','09:00 AM','12:00 PM','03:00 PM','08:00 PM'];

        const schedulesToCreate = [];
        let busIndex = 0;
        
        // For each route, assign 5 buses (one per time slot), each running for 3 days
        for (let r = 0; r < createdRoutes.length; r++) {
            for (let t = 0; t < 5; t++) {
                const assignedBus = createdBuses[busIndex];
                busIndex++;
                
                for (let d = 0; d < 3; d++) {
                    schedulesToCreate.push({
                        busId: assignedBus.id,
                        routeId: createdRoutes[r].id,
                        departureDate: datesToSchedule[d],
                        departureTime: departureTimes[t],
                        fare: 1000 + Math.floor(createdRoutes[r].distance * 5),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }
        }
        const createdSchedules = await Schedule.bulkCreate(schedulesToCreate, { returning: true });

        // Generate seats for ALL schedules
        const allSeats = [];
        for (let i = 0; i < createdSchedules.length; i++) {
            const scheduleId = createdSchedules[i].id;
            for (let s = 1; s <= 40; s++) {
                allSeats.push({
                    seatNumber: `S${s}`,
                    bookedSegments: [],
                    isBroken: false,
                    scheduleId: scheduleId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        
        console.log(`Inserting ${allSeats.length} seats... This might take a moment.`);
        // Bulk insert seats in chunks of 5000
        for (let i = 0; i < allSeats.length; i += 5000) {
            await Seat.bulkCreate(allSeats.slice(i, i + 5000));
        }

        console.log('Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedDB();
