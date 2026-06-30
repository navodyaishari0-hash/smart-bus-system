import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

/* return local YYYY-MM-DD without UTC shift */
function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function Home() {
    const [routes, setRoutes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('');
    const navigate = useNavigate();

    const today = localDateStr(new Date());
    const [selectedDate, setSelectedDate] = useState(today);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const apiBase = API_URL || '';

    useEffect(() => {
        axios.get(`${apiBase}/api/routes`)
            .then(res => setRoutes(res.data))
            .catch(err => console.error(err));
        axios.get(`${apiBase}/api/routes/locations`)
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
        let url = `${apiBase}/api/schedules?origin=${encodeURIComponent(selectedOrigin)}&destination=${encodeURIComponent(selectedDestination)}`;
        if (selectedDate) url += `&date=${encodeURIComponent(selectedDate)}`;
        try {
            const res = await axios.get(url);
            setSchedules(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            setSearchError(error.response?.data?.message || error.message || 'Search failed. Is the backend running?');
            setSchedules([]);
        } finally {
            setSearching(false);
        }
    };

    const inputBase = {
        width: '100%', marginBottom: 0, padding: '0.75rem 1rem',
        background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', color: '#e2e8f0', fontSize: '0.9rem',
        outline: 'none', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s'
    };
    const selectStyle = { ...inputBase, appearance: 'none', cursor: 'pointer', paddingRight: '2.2rem' };
    const labelStyle = { display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: 600 };

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url(/sri-lankan-bus-bg.png)',
                backgroundSize: 'cover', backgroundPosition: 'center', zIndex: -1
            }} />
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: -1, backdropFilter: 'blur(2px)'
            }} />

            <div style={{ textAlign: 'center', margin: '2rem 0', padding: '0 1rem' }}>
                <h1 style={{
                    fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', color: 'white',
                    textShadow: '0 4px 6px rgba(0,0,0,0.5)', marginBottom: '0.75rem',
                    lineHeight: 1.2
                }}>Your Journey Begins Here</h1>
                <p style={{
                    fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)', color: '#cbd5e1',
                    maxWidth: '600px', margin: '0 auto', padding: '0 0.5rem',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>Experience the most comfortable, reliable, and premium smart bus service.</p>
            </div>

            <div className="glass-panel animate-fade-in" style={{
                maxWidth: '960px', margin: '0 1rem 2rem', padding: '1.25rem',
                borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <form onSubmit={handleSearch} autoComplete="off">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ flex: '1 1 0%' }}>
                            <label style={labelStyle}>FROM</label>
                            <div style={{ position: 'relative' }}>
                                <select value={selectedOrigin} onChange={(e) => { setSelectedOrigin(e.target.value); setSelectedDestination(''); }} required
                                    style={selectStyle}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
                                    <option value="" style={{ background: '#1e293b' }}>Select origin</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc} style={{ background: '#1e293b' }}>{loc}</option>
                                    ))}
                                </select>
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', fontSize: '0.7rem' }}>▼</span>
                            </div>
                        </div>

                        <div style={{ flex: '1 1 0%' }}>
                            <label style={labelStyle}>TO</label>
                            <div style={{ position: 'relative' }}>
                                <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} required
                                    style={selectStyle}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
                                    <option value="" style={{ background: '#1e293b' }}>Select destination</option>
                                    {destinations.filter(d => d !== selectedOrigin).map(dest => (
                                        <option key={dest} value={dest} style={{ background: '#1e293b' }}>{dest}</option>
                                    ))}
                                </select>
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', fontSize: '0.7rem' }}>▼</span>
                            </div>
                        </div>

                        <div style={{ minWidth: '140px' }}>
                            <label style={labelStyle}>DATE</label>
                            <input type="date" value={selectedDate} min={today} max={localDateStr(new Date(Date.now() + 7*86400000))} onChange={(e) => setSelectedDate(e.target.value)}
                                style={inputBase}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                        </div>

                        <button type="submit" disabled={searching}
                            style={{
                                width: '100%', padding: '0.8rem 1.5rem', fontSize: '0.9rem',
                                fontWeight: 600, opacity: searching ? 0.6 : 1,
                                borderRadius: '12px', letterSpacing: '0.3px',
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                color: 'white', border: 'none', cursor: searching ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={e => !searching && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseOut={e => e.target.style.transform = 'translateY(0)'}>
                            {searching ? 'Searching...' : 'Search Buses'}
                        </button>
                    </div>
                </form>

                {searchError && (
                    <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'rgba(239,68,68,0.15)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem' }}>
                        {searchError}
                    </div>
                )}

                {searched && !searching && !searchError && schedules.length === 0 && (
                    <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No buses found</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Try a different route or date.</p>
                    </div>
                )}

                {schedules.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
                            Available Schedules ({schedules.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {schedules.map(schedule => (
                                <div key={schedule._id} onClick={() => navigate(`/book-seats/${schedule._id}?startStop=${encodeURIComponent(selectedOrigin)}&endStop=${encodeURIComponent(selectedDestination)}&date=${encodeURIComponent(selectedDate)}`)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)', padding: '1rem',
                                        borderRadius: '16px', display: 'flex', flexDirection: 'column',
                                        gap: '0.75rem', transition: 'all 0.2s', cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.05rem', lineHeight: 1.3 }}>
                                                {schedule.searchedOrigin && schedule.searchedDestination
                                                    ? `${schedule.searchedOrigin} to ${schedule.searchedDestination}`
                                                    : schedule.route?.name}
                                            </h3>
                                            {schedule.searchedOrigin && schedule.searchedDestination && (
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                                    Main Route: {schedule.route?.name}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)', margin: 0, lineHeight: 1 }}>
                                                Rs. {schedule.fare}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <span style={{ opacity: 0.5 }}>🚌</span> {schedule.bus?.busNumber}
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <span style={{ opacity: 0.5 }}>📅</span> {schedule.departureDate?.split('T')[0]}
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <span style={{ opacity: 0.5 }}>⏰</span> {schedule.departureTime}
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <span style={{ opacity: 0.5 }}>💺</span> {schedule.seats?.filter(s => !s.isBooked).length || 0} seats
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                                            {schedule.bus?.type}
                                        </span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/book-seats/${schedule._id}?startStop=${encodeURIComponent(selectedOrigin)}&endStop=${encodeURIComponent(selectedDestination)}&date=${encodeURIComponent(selectedDate)}`); }}
                                        style={{
                                            width: '100%', padding: '0.65rem', fontSize: '0.85rem', fontWeight: 600,
                                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                            color: 'white', border: 'none', borderRadius: '10px',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        onMouseOver={e => e.target.style.opacity = '0.9'}
                                        onMouseOut={e => e.target.style.opacity = '1'}>
                                        Select Seats
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
