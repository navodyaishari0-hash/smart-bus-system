import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;
        axios.get('http://localhost:5000/api/bookings/mybookings', {
            headers: { Authorization: `Bearer ${user.token}` }
        })
        .then(res => setBookings(res.data))
        .catch(err => console.error(err));
    }, [user]);

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>My Trips</h3>
                <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Book New Ticket</button>
            </div>
            
            {bookings.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                    <h3 style={{ color: 'var(--text-secondary)' }}>No bookings yet</h3>
                    <p style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Your upcoming trips will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {bookings.map(booking => (
                        <div key={booking._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--success)' }}></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-primary)' }}>{booking.schedule?.route?.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bus: {booking.schedule?.bus?.busNumber}</p>
                                </div>
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {booking.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date & Time</p>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {booking.schedule?.departureDate?.split('T')[0]}<br/>
                                        {booking.schedule?.departureTime}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Seats</p>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {booking.seatsBooked.join(', ')}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Fare</p>
                                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Rs. {booking.totalFare}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
