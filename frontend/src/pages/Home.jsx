import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const [routes, setRoutes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/api/routes')
            .then(res => setRoutes(res.data))
            .catch(err => console.error(err));
        axios.get('/api/routes/locations')
            .then(res => setLocations(res.data))
            .catch(err => console.error(err));
    }, []);

    const destinations = selectedOrigin
        ? [...new Set(
              routes
                  .filter(r => r.stops?.includes(selectedOrigin))
                  .flatMap(r => {
                      const idx = r.stops.indexOf(selectedOrigin);
                      return r.stops.slice(idx + 1);
                  })
          )].sort()
        : locations;

    const handleSearch = async (e) => {
        e.preventDefault();
        setSearching(true);
        setSearched(true);
        setSearchError(null);
        try {
            const res = await axios.get(`/api/schedules?origin=${selectedOrigin}&destination=${selectedDestination}&date=${selectedDate}`);
            setSchedules(res.data);
        } catch (error) {
            console.error(error);
            setSearchError(error.response?.data?.message || error.message || 'Search failed. Is the backend running?');
            setSchedules([]);
        } finally {
            setSearching(false);
        }
    };

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url(/sri-lankan-bus-bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: -1
            }}></div>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: -1, backdropFilter: 'blur(2px)' }}></div>

            <div style={{ textAlign: 'center', margin: '4rem 0 3rem 0' }}>
                <h1 style={{ fontSize: '3.5rem', color: 'white', textShadow: '0 4px 6px rgba(0,0,0,0.5)', marginBottom: '1rem' }}>Your Journey Begins Here</h1>
                <p style={{ fontSize: '1.2rem', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Experience the most comfortable, reliable, and premium smart bus service. Book your tickets instantly.</p>
            </div>

            <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>From</label>
                        <select value={selectedOrigin} onChange={(e) => { setSelectedOrigin(e.target.value); setSelectedDestination(''); }} required style={{ width: '100%', marginBottom: 0 }}>
                            <option value="">Origin</option>
                            {locations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>To</label>
                        <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} required style={{ width: '100%', marginBottom: 0 }}>
                            <option value="">Destination</option>
                            {destinations.filter(d => d !== selectedOrigin).map(dest => (
                                <option key={dest} value={dest}>{dest}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>Date</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required style={{ width: '100%', marginBottom: 0 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                        <button type="submit" className="btn btn-primary" disabled={searching} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', height: '42px', marginTop: 'auto', opacity: searching ? 0.6 : 1 }}>
                            {searching ? 'Searching...' : 'Search Buses'}
                        </button>
                    </div>
                </form>

                {/* Error */}
                {searchError && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.15)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.9rem' }}>
                        {searchError}
                    </div>
                )}

                {/* No results */}
                {searched && !searching && !searchError && schedules.length === 0 && (
                    <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No buses found</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Try a different route or date.</p>
                    </div>
                )}

                {/* Results */}
                {schedules.length > 0 && (
                    <div style={{ marginTop: '3rem' }}>
                        <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Available Schedules ({schedules.length})</h3>
                        {schedules.map(schedule => (
                            <div key={schedule._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.3rem 0', color: 'white', fontSize: '1.3rem' }}>{schedule.route?.name}</h3>
                                    <div style={{ color: '#94a3b8', margin: '0 0 0.3rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                                        <span>🚌 {schedule.bus?.busNumber} ({schedule.bus?.type})</span>
                                        <span>📅 {schedule.departureDate.split('T')[0]}</span>
                                        <span>⏰ {schedule.departureTime}</span>
                                        <span>💺 {schedule.seats?.filter(s => !s.isBooked).length || 0} seats</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', margin: '0 0 0.5rem 0' }}>Rs. {schedule.fare}</p>
                                    <button className="btn btn-primary" onClick={() => navigate(`/book-seats/${schedule._id}?startStop=${encodeURIComponent(selectedOrigin)}&endStop=${encodeURIComponent(selectedDestination)}`)}>
                                        Select Seats
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
