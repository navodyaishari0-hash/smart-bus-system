async function testBooking() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alice@example.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in:", token.substring(0, 10));

        const schedulesRes = await fetch('http://localhost:5000/api/schedules');
        const schedules = await schedulesRes.json();
        const schedule = schedules[0];
        console.log("Got schedule:", schedule.id);

        const bookRes = await fetch('http://localhost:5000/api/bookings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                scheduleId: schedule.id,
                seatsToBook: ['S1'],
                passengerDetails: { fullName: "Test", email: "test@test.com", phone: "123" }
            })
        });
        const bookData = await bookRes.json();
        if (!bookRes.ok) throw new Error(bookData.message || 'Booking failed');
        console.log("Booking SUCCESS:", bookData);
    } catch (error) {
        console.error("Booking FAILED:", error.message);
    }
}

testBooking();
