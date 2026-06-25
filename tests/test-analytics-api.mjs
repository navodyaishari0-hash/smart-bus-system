// ─────────────────────────────────────────────────────────────
// Smart Bus System — Analytics API Integration Test Runner
// Usage:  node tests/test-analytics-api.mjs
// Requires native fetch (Node.js 18+) or install `node-fetch`
// ─────────────────────────────────────────────────────────────

const BASE = 'http://localhost:5000/api';

async function main() {
    console.log('\n═══ Smart Bus Analytics API Tests ═══\n');

    // ── Step 1: Login ──────────────────────────────────────
    console.log('▶  Step 1: Login as admin...');
    let token;
    try {
        const loginRes = await fetch(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@smartbus.com',
                password: 'password123'
            })
        });
        if (!loginRes.ok) {
            const errBody = await loginRes.text();
            throw new Error(`Login failed (${loginRes.status}): ${errBody}`);
        }
        const loginData = await loginRes.json();
        token = loginData.token;
        if (!token) throw new Error('No token in login response');
        console.log(`   ✓ Login OK. Token: ${token.substring(0, 20)}...\n`);
    } catch (err) {
        console.error(`   ✗ ${err.message}`);
        console.log('   💡 Make sure the backend is running on port 5000.');
        process.exit(1);
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
    };

    // ── Step 2: GET Booking Trends ─────────────────────────
    console.log('▶  Step 2: GET /api/analytics/bookings-trend');
    try {
        const res = await fetch(`${BASE}/analytics/bookings-trend`, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`${res.status} ${text}`);
        }
        const data = await res.json();

        console.log('   ✓ Response received.\n');

        // ── Hourly summary ──
        const nonZeroHours = data.hourly.filter(h => h.count > 0);
        console.log(`   ┌── Hourly Distribution (${nonZeroHours.length} non-zero hours, ${data.hourly.reduce((s, h) => s + h.count, 0)} total)`);
        nonZeroHours.forEach(h => {
            const bar = '█'.repeat(Math.round(h.count / 5) || 1);
            console.log(`   │ ${h.label.padEnd(7)} ${String(h.count).padStart(5)} ${bar}`);
        });

        // ── Weekly summary ──
        console.log(`\n   ┌── Weekly Distribution`);
        data.weekly.forEach(d => {
            const bar = '█'.repeat(Math.round(d.count / 10) || 1);
            console.log(`   │ ${d.day.padEnd(10)} ${String(d.count).padStart(5)} ${bar}`);
        });

        // ── Route popularity ──
        console.log(`\n   ┌── Route Popularity (top 5)`);
        (data.routePopularity || []).slice(0, 5).forEach(r => {
            console.log(`   │ ${String(r.routeName || 'Route #' + r.routeId).padEnd(35)} ${String(r.count).padStart(5)} bookings`);
        });

        console.log();
    } catch (err) {
        console.error(`   ✗ Booking Trends test failed: ${err.message}\n`);
    }

    // ── Step 3: GET Seat Preference ─────────────────────────
    console.log('▶  Step 3: GET /api/analytics/seat-preference');
    try {
        const res = await fetch(`${BASE}/analytics/seat-preference`, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`${res.status} ${text}`);
        }
        const data = await res.json();

        console.log('   ✓ Response received.\n');

        console.log(`   Total bookings processed: ${data.totalBookings}`);
        console.log();

        // ── Position split ──
        console.log(`   ┌── Seat Position (Window vs Aisle)`);
        if (data.position && data.position.labels) {
            data.position.labels.forEach((label, i) => {
                const val = data.position.values[i];
                const pct = data.position.percent[label];
                const bar = '█'.repeat(Math.round((val / data.totalBookings) * 40) || 1);
                console.log(`   │ ${label.padEnd(10)} ${String(val).padStart(5)} (${String(pct).padStart(2)}%) ${bar}`);
            });
        }

        // ── Zone split ──
        console.log(`\n   ┌── Seat Zone (Front / Middle / Back)`);
        if (data.zone && data.zone.labels) {
            data.zone.labels.forEach((label, i) => {
                if (label === 'Unknown') return;
                const val = data.zone.values[i];
                const pct = data.zone.percent[label];
                const bar = '█'.repeat(Math.round((val / data.totalBookings) * 40) || 1);
                console.log(`   │ ${label.padEnd(10)} ${String(val).padStart(5)} (${String(pct).padStart(2)}%) ${bar}`);
            });
        }

        // ── Top seats ──
        console.log(`\n   ┌── Top 10 Most Booked Seats`);
        (data.seatRanking || []).slice(0, 10).forEach(s => {
            console.log(`   │ ${s.seatNumber.padEnd(6)} ${String(s.count).padStart(4)} x  (${s.position}, ${s.zone})`);
        });

        console.log('\n═══ All tests completed ═══\n');
    } catch (err) {
        console.error(`   ✗ Seat Preference test failed: ${err.message}\n`);
        process.exit(1);
    }
}

main();
