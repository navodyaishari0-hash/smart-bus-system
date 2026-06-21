import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function ConductorDashboard() {
    const [schedules, setSchedules] = useState([]);
    const { user } = useAuthStore();

    const fetchSchedules = () => {
        axios.get('/api/schedules')
            .then(res => setSchedules(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const toggleBusStatus = async (busId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Broken' : 'Active';
            await axios.patch(`/api/buses/${busId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchSchedules(); // Refresh the schedules list to see updated status
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const toggleSeat = async (scheduleId, seatId) => {
        try {
            await axios.patch(`/api/schedules/${scheduleId}/seats/${seatId}/toggle`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchSchedules(); // Refresh to see updated seat status
        } catch (error) {
            console.error('Failed to toggle seat status', error);
        }
    };

    return (
        <div className="animate-fade-in">
            <h2>Conductor Dashboard</h2>
            <div className="glass-panel" style={{ marginTop: '2rem' }}>
                <h3>Assigned Trips</h3>
                {schedules.map(schedule => (
                    <div key={schedule._id} style={{ padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '8px', marginTop: '1rem' }}>
                        <h4>{schedule.route?.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p>Bus: {schedule.bus?.busNumber}</p>
                                <span style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    background: (schedule.bus?.status || 'Active') === 'Active' ? 'var(--success)' : 'var(--danger)',
                                    color: 'white',
                                    display: 'inline-block',
                                    marginBottom: '0.5rem'
                                }}>
                                    Status: {schedule.bus?.status || 'Active'}
                                </span>
                            </div>
                            <button 
                                onClick={() => toggleBusStatus(schedule.bus?._id, schedule.bus?.status || 'Active')}
                                className="btn" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)' }}
                            >
                                Report { (schedule.bus?.status || 'Active') === 'Active' ? 'Broken' : 'Fixed' }
                            </button>
                        </div>
                        <p>Departure: {schedule.departureDate?.split('T')[0]} at {schedule.departureTime}</p>
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h5 style={{ margin: 0 }}>Seat Status</h5>
                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--success)', borderRadius: '4px', color: 'white' }}>Available</span>
                                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--danger)', borderRadius: '4px', color: 'white' }}>Booked</span>
                                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--warning)', borderRadius: '4px', color: 'white' }}>Broken</span>
                                </div>
                            </div>
                            <div style={{ 
                                border: '2px solid var(--glass-border)', 
                                borderRadius: '40px 40px 12px 12px', 
                                padding: '2rem', 
                                maxWidth: '350px',
                                margin: '2rem auto',
                                background: 'rgba(0,0,0,0.2)' 
                            }}>
                                {/* Driver Area */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                    <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        Driver
                                    </div>
                                </div>
                                
                                {/* Seats Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1fr', gap: '0.5rem' }}>
                                    {schedule.seats.map((seat, index) => (
                                        <Fragment key={seat._id}>
                                            {/* Insert aisle gap after the first two columns (every 4 seats) */}
                                            {index % 4 === 2 && <div />}
                                            <div 
                                                onClick={() => toggleSeat(schedule._id, seat._id)}
                                                style={{ 
                                                    padding: '0.5rem 0.2rem', 
                                                    textAlign: 'center', 
                                                    borderRadius: '8px',
                                                    background: seat.isBroken ? 'var(--warning)' : seat.isBooked ? 'var(--danger)' : 'var(--success)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.2)'
                                                }}
                                                title={seat.isBroken ? "Click to make available" : seat.isBooked ? "Click to mark as broken" : "Click to mark as booked"}
                                            >
                                                {seat.seatNumber}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

