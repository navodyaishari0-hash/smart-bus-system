async function runTest() {
  const baseURL = 'http://localhost:5000/api';
  console.log("🚀 Starting Booking Flow Test...");

  try {
    // 1. Fetch routes to find valid start/end stops
    console.log("\n1️⃣ Fetching routes...");
    let res = await fetch(`${baseURL}/routes`);
    let data = await res.json();
    if (data.length === 0) throw new Error("No routes found");
    const route = data[0];
    const origin = route.stops[0];
    const destination = route.stops[route.stops.length - 1];
    console.log(`Found Route: ${route.name} (${origin} -> ${destination})`);

    // 2. Search for schedules
    console.log(`\n2️⃣ Searching schedules for ${origin} -> ${destination}...`);
    res = await fetch(`${baseURL}/schedules?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
    data = await res.json();
    if (data.length === 0) throw new Error("No schedules found for this route");
    const scheduleId = data[0].id;
    console.log(`Found Schedule ID: ${scheduleId}`);

    // 3. Login
    console.log("\n3️⃣ Logging in...");
    res = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "alice@test.com", password: "password123" })
    });
    data = await res.json();
    if (!res.ok) {
      console.log("Login failed, assuming first-time run. Creating user...");
      const regRes = await fetch(`${baseURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Alice Tester", email: "alice@test.com", password: "password123", role: "passenger" })
      });
      data = await regRes.json();
    }
    const token = data.token;
    console.log(`Logged in successfully as ${data.name || "Alice Tester"}`);

    // 4. Fetch available seats
    console.log("\n4️⃣ Fetching seats for the schedule...");
    res = await fetch(`${baseURL}/schedules/${scheduleId}/seats`);
    data = await res.json();
    const availableSeat = data.find(s => !s.isBooked && !s.isBroken && s.status !== "Booked" && s.status !== "Broken");
    if (!availableSeat) throw new Error("No available seats found on this schedule");
    console.log(`Selected Seat: ${availableSeat.seatNumber}`);

    // 5. Book the seat
    console.log("\n5️⃣ Attempting to book the seat...");
    res = await fetch(`${baseURL}/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        scheduleId,
        seatsToBook: [availableSeat.seatNumber],
        passengerDetails: { fullName: "Alice Tester", email: "alice@test.com", phone: "+94770001111" },
        startStop: origin,
        endStop: destination
      })
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message || "Booking failed");

    console.log("\n✅ BOOKING SUCCESSFUL!");
    console.log("Booking Details:", data);

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  }
}

runTest();
