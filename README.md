# Smart Bus Reservation System

A full-stack web application designed for booking and managing bus tickets, featuring real-time seat availability and role-based access for Passengers, Bus Conductors, and Super Admins.

## Technology Stack

* **Frontend Development:** React.js
* **Backend Development:** Node.js
* **Server-side Framework:** Express.js
* **Database Management:** MongoDB
* **Code Editor:** Visual Studio Code
* **Version Control:** GitHub
* **API Testing:** Postman
* **Operating System:** Windows 10/11

## Key Features
* **Role-Based Dashboards**: Distinct, secure views for Passengers, Conductors, and Super Admins.
* **Real-Time Seat Booking**: Interactive seat map that prevents double-booking.
* **Schedule & Route Management**: Admins can easily manage buses, routes, and departure schedules.
* **Secure Authentication**: Encrypted passwords and protected routes.

## How to Run Locally

1. **Install dependencies** (if you haven't already):
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Start the Backend Server**:
   Open a terminal and run:
   ```bash
   cd backend
   npm run start
   ```
   *(The server will run on port 5000 and connect to MongoDB)*

3. **Start the Frontend Application**:
   Open a new terminal tab and run:
   ```bash
   cd frontend
   npm run dev
   ```
   *(The frontend will be available at http://localhost:5173/)*

## Database Schema Overview

The MongoDB database consists of the following primary collections:

* **Users**: Stores user information, roles (`passenger`, `conductor`, `admin`), and encrypted passwords.
* **Buses**: Contains bus details such as bus number, capacity, type (e.g., AC/Non-AC), and assigned conductor.
* **Routes**: Defines the travel paths including origin, destination, distance, and estimated duration.
* **Schedules**: Links buses and routes to specific departure dates/times, fares, and tracks the array of seats and their booking status.
* **Bookings**: Records passenger seat reservations, linking to the schedule, user, and calculating total fare and payment status.

## Core API Endpoints

### Authentication
* `POST /api/auth/register` - Register a new user
* `POST /api/auth/login` - Login and receive JWT token

### Buses & Routes
* `GET /api/buses` - Get all buses (Admin)
* `GET /api/routes` - Get all routes

### Schedules & Bookings
* `GET /api/schedules` - Search for available bus schedules
* `POST /api/bookings` - Create a new seat reservation (Passenger)
* `GET /api/bookings/my-bookings` - Get user's bookings
* `GET /api/bookings/conductor` - Get bookings for a conductor's assigned bus
