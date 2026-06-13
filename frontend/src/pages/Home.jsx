import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const [routes, setRoutes] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('http://localhost:5000/api/routes')
            .then(res => setRoutes(res.data))
            .catch(err => console.error(err));
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.get(`http://localhost:5000/api/schedules?origin=${selectedOrigin}&destination=${selectedDestination}&date=${selectedDate}`);
            setSchedules(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Find Your Bus</h1>
            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                <select value={selectedOrigin} onChange={(e) => setSelectedOrigin(e.target.value)} required>
                    <option value="">Origin</option>
                    {[...new Set(routes.map(r => r.origin))].map(origin => (
                        <option key={origin} value={origin}>{origin}</option>
                    ))}
                </select>
                <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} required>
                    <option value="">Destination</option>
                    {[...new Set(routes.map(r => r.destination))].map(dest => (
                        <option key={dest} value={dest}>{dest}</option>
                    ))}
                </select>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required style={{ marginBottom: 0 }} />
                <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>Search</button>
            </form>

            <div style={{ marginTop: '3rem' }}>
                {schedules.map(schedule => (
                    <div key={schedule._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>{schedule.route?.name}</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {schedule.departureDate.split('T')[0]} at {schedule.departureTime}
                            </p>
                            <p>Fare: Rs. {schedule.fare}</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate(`/passenger/book/${schedule._id}`)}>
                            View Seats
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
