import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function BookSeat() {
    const { scheduleId } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', specialRequests: '' });
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/api/schedules/${scheduleId}`)
            .then(res => setSchedule(res.data))
            .catch(err => { console.error(err); setFetchError(err.response?.data?.message || 'Failed to load schedule'); });
    }, [scheduleId]);

    const toggleSeat = (seatNumber) => {
        if (selectedSeats.includes(seatNumber)) setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
        else setSelectedSeats([...selectedSeats, seatNumber]);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContinue = () => {
        if (selectedSeats.length === 0) return alert('Select at least one seat');
        setStep(2);
    };

    const handleBook = async () => {
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) return alert('Please fill in all passenger details');
        setLoading(true);
        try {
            await axios.post('/api/bookings', { scheduleId, seatsToBook: selectedSeats, passengerDetails: formData }, { headers: { Authorization: `Bearer ${user.token}` } });
            setLoading(false);
            alert('Booking confirmed successfully!');
            navigate('/passenger');
        } catch (error) {
            setLoading(false);
            alert(error.response?.data?.message || 'Booking failed');
        }
    };

    if (fetchError) return (
        <div className="glass-panel" style={{ padding: '2rem 1.25rem', textAlign: 'center', maxWidth: '600px', margin: '1rem', borderRadius: '16px' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Error</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{fetchError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
        </div>
    );
    if (!schedule) return <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading schedule...</div>;

    return (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', margin: '1rem', padding: '1.25rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Seat Booking</h3>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div><p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem', letterSpacing: '0.5px' }}>BUS</p><p style={{ fontWeight: 'bold' }}>{schedule.bus?.busNumber}</p></div>
                    <div><p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem', letterSpacing: '0.5px' }}>ROUTE</p><p style={{ fontWeight: 'bold' }}>{schedule.route?.name}</p></div>
                    <div><p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem', letterSpacing: '0.5px' }}>DEPARTURE</p><p style={{ fontWeight: 'bold' }}>{schedule.departureDate?.split('T')[0]} at {schedule.departureTime}</p></div>
                    <div><p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem', letterSpacing: '0.5px' }}>FARE/SEAT</p><p style={{ fontWeight: 'bold', color: 'var(--success)' }}>Rs. {schedule.fare}</p></div>
                </div>
            </div>

            {step === 1 ? (
                <>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Step 1: Select Your Seats</h4>
                    <div style={{ border: '2px solid var(--glass-border)', borderRadius: '40px 40px 12px 12px', padding: '1.25rem', maxWidth: '500px', margin: '0 auto 1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                            <div style={{ padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>Driver</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                            {(schedule.seats || []).map((seat, index) => (
                                <Fragment key={seat._id}>
                                    {index % 4 === 2 && <div />}
                                    <button disabled={seat.isBooked || seat.isBroken} onClick={() => toggleSeat(seat.seatNumber)}
                                        style={{
                                            padding: '0.45rem 0.1rem', borderRadius: '8px', fontSize: '0.75rem',
                                            border: selectedSeats.includes(seat.seatNumber) ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.2)',
                                            cursor: (seat.isBooked || seat.isBroken) ? 'not-allowed' : 'pointer',
                                            background: seat.isBroken ? 'var(--warning)' : seat.isBooked ? 'var(--danger)' : selectedSeats.includes(seat.seatNumber) ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                            color: 'white', fontWeight: 'bold',
                                            transition: 'all 0.2s', boxShadow: selectedSeats.includes(seat.seatNumber) ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'inset 0 -3px 0 rgba(0,0,0,0.2)'
                                        }}>
                                        {seat.seatNumber}
                                    </button>
                                </Fragment>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.75rem, 3vw, 2rem)', fontSize: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        {[
                            { bg: 'rgba(255,255,255,0.1)', label: 'Available' },
                            { bg: 'var(--success)', label: 'Selected' },
                            { bg: 'var(--danger)', label: 'Booked' },
                            { bg: 'var(--warning)', label: 'Broken' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{ width: '14px', height: '14px', background: item.bg, borderRadius: '4px' }} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {selectedSeats.length > 0 && (
                        <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--success)', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>{selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Seats: <strong>{selectedSeats.join(', ')}</strong></p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Total: <strong style={{ color: 'var(--success)', fontSize: '0.95rem' }}>Rs. {schedule.fare * selectedSeats.length}</strong></p>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button className="btn btn-primary" onClick={handleContinue} disabled={selectedSeats.length === 0}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '12px', opacity: selectedSeats.length === 0 ? 0.5 : 1 }}>
                            Continue to Details →
                        </button>
                        <button className="btn" onClick={() => navigate('/')} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                            Cancel
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Step 2: Passenger Details</h4>
                    <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                        <p style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Seats: <strong>{selectedSeats.join(', ')}</strong></p>
                        <p style={{ fontSize: '0.8rem' }}>Total: <strong style={{ color: 'var(--success)' }}>Rs. {schedule.fare * selectedSeats.length}</strong></p>
                    </div>

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { name: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'Enter your full name' },
                            { name: 'email', label: 'Email *', type: 'email', placeholder: 'Enter your email' },
                            { name: 'phone', label: 'Phone Number *', type: 'tel', placeholder: 'Enter your phone number' },
                            { name: 'specialRequests', label: 'Special Requests', type: 'text', placeholder: 'Any special requests?' },
                        ].map(f => (
                            <div key={f.name}>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                                <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleInputChange} placeholder={f.placeholder} required={f.name !== 'specialRequests'}
                                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }} />
                            </div>
                        ))}
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button className="btn btn-success" onClick={handleBook} disabled={loading}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '12px', opacity: loading ? 0.5 : 1 }}>
                            {loading ? 'Processing...' : 'Confirm Booking'}
                        </button>
                        <button className="btn" onClick={() => setStep(1)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                            ← Back to Seats
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
