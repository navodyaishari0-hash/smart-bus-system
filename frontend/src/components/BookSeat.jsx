import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function BookSeat() {
    const { scheduleId } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: seat selection, 2: confirm
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        specialRequests: ''
    });
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`http://localhost:5000/api/schedules/${scheduleId}`)
            .then(res => setSchedule(res.data))
            .catch(err => console.error(err));
    }, [scheduleId]);

    const toggleSeat = (seatNumber) => {
        if (selectedSeats.includes(seatNumber)) {
            setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
        } else {
            setSelectedSeats([...selectedSeats, seatNumber]);
        }
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
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
            return alert('Please fill in all passenger details');
        }
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/bookings', {
                scheduleId,
                seatsToBook: selectedSeats,
                passengerDetails: formData
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setLoading(false);
            alert('Booking confirmed successfully!');
            navigate('/passenger');
        } catch (error) {
            setLoading(false);
            alert(error.response?.data?.message || 'Booking failed');
        }
    };

    if (!schedule) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading schedule...</div>;

    return (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', margin: '2rem auto', padding: '2rem' }}>
            <h3 style={{ marginBottom: '2rem' }}>🚌 Seat Booking Form</h3>
            
            {/* Trip Details */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Bus</p>
                        <p style={{ fontWeight: 'bold' }}>{schedule.bus?.busNumber}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Route</p>
                        <p style={{ fontWeight: 'bold' }}>{schedule.route?.name}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Departure</p>
                        <p style={{ fontWeight: 'bold' }}>{schedule.departureDate.split('T')[0]} at {schedule.departureTime}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Fare per Seat</p>
                        <p style={{ fontWeight: 'bold', color: 'var(--success)' }}>Rs. {schedule.fare}</p>
                    </div>
                </div>
            </div>

            {step === 1 ? (
                <>
                    {/* Seat Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Step 1: Select Your Seats</h4>
                        <div style={{ 
                            border: '2px solid var(--glass-border)', 
                            borderRadius: '40px 40px 12px 12px', 
                            padding: '2rem', 
                            maxWidth: '500px',
                            margin: '0 auto 2rem',
                            background: 'rgba(0,0,0,0.2)' 
                        }}>
                            {/* Driver Area */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    🚗 Driver
                                </div>
                            </div>
                            
                            {/* Seats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                                {schedule.seats.map((seat, index) => (
                                    <Fragment key={seat._id}>
                                        {index % 4 === 2 && <div />}
                                        <button
                                            disabled={seat.isBooked || seat.isBroken}
                                            onClick={() => toggleSeat(seat.seatNumber)}
                                            style={{
                                                padding: '0.5rem 0.2rem',
                                                borderRadius: '8px',
                                                border: selectedSeats.includes(seat.seatNumber) ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.2)',
                                                cursor: (seat.isBooked || seat.isBroken) ? 'not-allowed' : 'pointer',
                                                background: seat.isBroken ? 'var(--warning)' : seat.isBooked ? 'var(--danger)' : selectedSeats.includes(seat.seatNumber) ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.2s',
                                                boxShadow: selectedSeats.includes(seat.seatNumber) ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'inset 0 -3px 0 rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {seat.seatNumber}
                                        </button>
                                    </Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Seat Legend */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.85rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '20px', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
                                <span>Available</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '20px', height: '20px', background: 'var(--success)', borderRadius: '4px' }}></div>
                                <span>Selected</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '20px', height: '20px', background: 'var(--danger)', borderRadius: '4px' }}></div>
                                <span>Booked</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '20px', height: '20px', background: 'var(--warning)', borderRadius: '4px' }}></div>
                                <span>Broken</span>
                            </div>
                        </div>

                        {/* Selected Seats Summary */}
                        {selectedSeats.length > 0 && (
                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--success)', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Seats: <strong>{selectedSeats.join(', ')}</strong></p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>Rs. {schedule.fare * selectedSeats.length}</strong></p>
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn" onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)' }}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleContinue} disabled={selectedSeats.length === 0}>
                            Continue to Details →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Passenger Details Form */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Step 2: Passenger Details</h4>
                        
                        {/* Selected Seats */}
                        <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>📍 Selected Seats: <strong>{selectedSeats.join(', ')}</strong></p>
                            <p style={{ fontSize: '0.9rem' }}>💰 Total Amount: <strong style={{ color: 'var(--success)' }}>Rs. {schedule.fare * selectedSeats.length}</strong></p>
                        </div>

                        {/* Form */}
                        <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name *</label>
                                <input 
                                    type="text" 
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email *</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Phone Number *</label>
                                <input 
                                    type="tel" 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Special Requests</label>
                                <input 
                                    type="text" 
                                    name="specialRequests"
                                    value={formData.specialRequests}
                                    onChange={handleInputChange}
                                    placeholder="Any special requests?"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Confirm Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn" onClick={() => setStep(1)} style={{ background: 'rgba(255,255,255,0.1)' }}>
                            ← Back to Seats
                        </button>
                        <button className="btn btn-success" onClick={handleBook} disabled={loading} style={{ minWidth: '200px' }}>
                            {loading ? 'Processing...' : '✓ Confirm Booking'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
