import React, { useState, useEffect, Fragment, useMemo } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_COLS = 4;

export default function ConductorDashboard() {
    const { user } = useAuthStore();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [togglingSeat, setTogglingSeat] = useState(null);
    const [togglingBus, setTogglingBus] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get('/api/conductor/schedules', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setSchedules(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    /* ---------- Extract unique dates ---------- */
    const dateOptions = useMemo(() => {
        const seen = new Set();
        const dates = [];
        for (const s of schedules) {
            const d = s.departureDate?.split('T')[0];
            if (d && !seen.has(d)) {
                seen.add(d);
                dates.push(d);
            }
        }
        dates.sort();
        return dates;
    }, [schedules]);

    /* Auto-select the first date when data loads */
    useEffect(() => {
        if (dateOptions.length > 0 && !selectedDate) {
            setSelectedDate(dateOptions[0]);
        }
    }, [dateOptions, selectedDate]);

    /* ---------- Filter schedules for selected date ---------- */
    const filteredSchedules = useMemo(() => {
        if (!selectedDate) return [];
        return schedules.filter(s => (s.departureDate?.split('T')[0]) === selectedDate);
    }, [schedules, selectedDate]);

    /* ---------- Handlers ---------- */
    const toggleBusStatus = async (busId, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Broken' : 'Active';
        setTogglingBus(busId);
        try {
            await axios.patch(`/api/buses/${busId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setSchedules(prev =>
                prev.map(s =>
                    s.bus?._id === busId
                        ? { ...s, bus: { ...s.bus, status: newStatus } }
                        : s
                )
            );
        } catch (err) {
            console.error('Failed to update bus status', err);
        } finally {
            setTogglingBus(null);
        }
    };

    const toggleSeat = async (scheduleId, seatId) => {
        setTogglingSeat(seatId);
        try {
            const { data } = await axios.patch(`/api/schedules/${scheduleId}/seats/${seatId}/toggle`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const updated = data.seat;
            setSchedules(prev =>
                prev.map(s => {
                    if (s._id !== scheduleId) return s;
                    return {
                        ...s,
                        seats: s.seats.map(seat =>
                            seat._id === seatId
                                ? {
                                    ...seat,
                                    isBroken: updated.isBroken,
                                    isBooked: Array.isArray(updated.bookedSegments) && updated.bookedSegments.length > 0,
                                    bookedSegments: updated.bookedSegments
                                }
                                : seat
                        )
                    };
                })
            );
        } catch (err) {
            console.error('Failed to toggle seat', err);
        } finally {
            setTogglingSeat(null);
        }
    };

    /* ---------- Helpers ---------- */
    const seatColor = (seat) => {
        if (seat.isBroken) return 'var(--warning)';
        if (seat.isBooked) return 'var(--danger)';
        return 'var(--success)';
    };

    const seatLabel = (seat) => {
        if (seat.isBroken) return 'Broken — click to free';
        if (seat.isBooked) return 'Booked — click to mark broken';
        return 'Available — click to book';
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const renderSeatGrid = (schedule) => {
        const seats = schedule.seats || [];
        return (
            <div className="seat-grid-container">
                <div className="driver-area">
                    <span className="driver-label">Driver</span>
                </div>
                <div className="cseat-grid">
                    {seats.map((seat, idx) => (
                        <Fragment key={seat._id}>
                            {idx % GRID_COLS === 2 && <div className="seat-aisle" />}
                            <button
                                className={`seat-btn ${togglingSeat === seat._id ? 'seat-toggling' : ''}`}
                                style={{ background: seatColor(seat) }}
                                onClick={() => toggleSeat(schedule._id, seat._id)}
                                disabled={togglingSeat === seat._id}
                                title={seatLabel(seat)}
                            >
                                {seat.seatNumber}
                            </button>
                        </Fragment>
                    ))}
                </div>
            </div>
        );
    };

    /* ---------- Loading ---------- */
    if (loading) {
        return (
            <div className="animate-fade-in d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 400 }}>
                <div className="spinner-border text-light mb-3" role="status" />
                <p className="text-light opacity-75">Loading your schedules...</p>
            </div>
        );
    }

    /* ---------- Error ---------- */
    if (error) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p className="text-danger mb-3">{error}</p>
                <button className="btn" onClick={fetchSchedules}>Retry</button>
            </div>
        );
    }

    /* ---------- Empty ---------- */
    if (schedules.length === 0) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <h4 className="mb-2">No Assigned Trips</h4>
                <p className="text-light opacity-50">You have no bus schedules assigned yet.</p>
            </div>
        );
    }

    /* ---------- Main render ---------- */
    return (
        <div className="animate-fade-in">
            <h2 className="mb-4">Conductor Dashboard</h2>

            {/* Date filter bar */}
            <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Calendar size={16} />
                        <span style={{ fontWeight: 600 }}>Trip Date</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1 }}>
                        {dateOptions.map(d => (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(d)}
                                style={{
                                    padding: '0.35rem 0.9rem', borderRadius: 8, border: 'none',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                    background: selectedDate === d ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                                    color: selectedDate === d ? 'white' : 'var(--text-secondary)',
                                    boxShadow: selectedDate === d ? '0 2px 10px rgba(59,130,246,0.3)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {formatDate(d)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Schedule cards for selected date */}
            {filteredSchedules.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <Calendar size={40} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '1rem' }} />
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No trips for this date</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', opacity: 0.6 }}>
                        There are no bus schedules assigned to you on {selectedDate ? formatDate(selectedDate) : 'this date'}.
                    </p>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem'
                    }}>
                        <h4 style={{ margin: 0 }}>
                            {formatDate(selectedDate)}
                            <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.75rem' }}>
                                {filteredSchedules.length} trip{filteredSchedules.length > 1 ? 's' : ''}
                            </span>
                        </h4>
                    </div>

                    {filteredSchedules.map(schedule => (
                        <div key={schedule._id} className="conductor-card">
                            {/* Header row */}
                            <div className="conductor-card-header">
                                <div>
                                    <h5 className="mb-1">{schedule.route?.name || 'N/A'}</h5>
                                    <p className="text-light opacity-50 mb-0" style={{ fontSize: '0.85rem' }}>
                                        Bus {schedule.bus?.busNumber} &middot; {schedule.bus?.type}
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className={`status-badge ${(schedule.bus?.status || 'Active') === 'Active' ? 'status-active' : 'status-broken'}`}>
                                        {schedule.bus?.status || 'Active'}
                                    </span>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                        onClick={() => toggleBusStatus(schedule.bus?._id, schedule.bus?.status || 'Active')}
                                        disabled={togglingBus === schedule.bus?._id}
                                    >
                                        {togglingBus === schedule.bus?._id
                                            ? '...'
                                            : `Report ${(schedule.bus?.status || 'Active') === 'Active' ? 'Broken' : 'Fixed'}`
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Departure info */}
                            <div className="conductor-card-meta">
                                <span>Departs at {schedule.departureTime}</span>
                                <span>Fare: ${parseFloat(schedule.fare || 0).toFixed(2)}</span>
                            </div>

                            {/* Legend */}
                            <div className="seat-legend">
                                <span className="legend-dot" style={{ background: 'var(--success)' }} /> Available
                                <span className="legend-dot" style={{ background: 'var(--danger)' }} /> Booked
                                <span className="legend-dot" style={{ background: 'var(--warning)' }} /> Broken
                            </div>

                            {/* Seat grid */}
                            {renderSeatGrid(schedule)}

                            {/* Summary */}
                            <div className="seat-summary">
                                <span>Total: {schedule.seats?.length || 0}</span>
                                <span style={{ color: 'var(--success)' }}>
                                    Available: {schedule.seats?.filter(s => !s.isBooked && !s.isBroken).length || 0}
                                </span>
                                <span style={{ color: 'var(--danger)' }}>
                                    Booked: {schedule.seats?.filter(s => s.isBooked).length || 0}
                                </span>
                                <span style={{ color: 'var(--warning)' }}>
                                    Broken: {schedule.seats?.filter(s => s.isBroken).length || 0}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
