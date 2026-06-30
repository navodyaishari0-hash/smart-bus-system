import React, { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Calendar, Users, Gauge, Clock, AlertTriangle, Navigation } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

const GRID_COLS = 4;

export default function ConductorDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => { if (!user?.token) navigate('/login'); }, [user, navigate]);

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [togglingSeat, setTogglingSeat] = useState(null);
    const [togglingBus, setTogglingBus] = useState(null);
    const [activeScheduleId, setActiveScheduleId] = useState(null);
    const [showDelayForm, setShowDelayForm] = useState(false);
    const [delayMinutes, setDelayMinutes] = useState(5);
    const [delayReason, setDelayReason] = useState('');
    const [delaySubmitting, setDelaySubmitting] = useState(false);
    const [delayInfo, setDelayInfo] = useState(null);

    /* ── live GPS tracking ── */
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const [tripStatus, setTripStatus] = useState('idle');  /* idle | inTransit | ended */
    const [currentLocation, setCurrentLocation] = useState(null);

    const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get('/api/conductor/schedules', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setSchedules(data);
            if (data.length > 0 && !activeScheduleId) setActiveScheduleId(data[0]._id);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    /* single socket connection for all listeners + GPS streaming */
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        /* register conductor identity for potential server-targeted events */
        if (user?.id) socket.emit('registerUser', user.id);

        socket.on('seatUpdated', () => fetchSchedules());
        socket.on('delayUpdated', (data) => {
            if (data.isActive) setDelayInfo(data);
            else setDelayInfo(null);
        });
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    /* ── start / stop geolocation watch ── */
    useEffect(() => {
        if (tripStatus === 'inTransit' && activeScheduleId && socketRef.current) {
            /* start watching position */
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setCurrentLocation({ lat, lng });
                    socketRef.current.emit('updateBusLocation', { scheduleId: activeScheduleId, lat, lng });
                },
                (err) => console.warn('[GPS] watchPosition error:', err.message),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } else {
            /* stop watching */
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }
        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [tripStatus, activeScheduleId]);

    /* ── simulation trip state ── */
    const simIntervalRef = useRef(null);
    const [simulating, setSimulating] = useState(false);
    const [simStep, setSimStep] = useState(-1);

    const MOCK_ROUTE = [
        { lat: 8.3114, lng: 80.4037, label: 'Anuradhapura (start)' },
        { lat: 8.3500, lng: 80.5500, label: '~20 km ENE' },
        { lat: 8.4000, lng: 80.7500, label: '~22 km E' },
        { lat: 8.5000, lng: 81.0000, label: '~28 km ESE (≈25 km out)' },
        { lat: 8.5700, lng: 81.1900, label: '~3.4 km → PROXIMITY ZONE' },
        { lat: 8.5873, lng: 81.2152, label: 'Trincomalee (arrived)' },
    ];

    const handleSimulateTrip = () => {
        if (simulating) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
            setSimulating(false);
            setSimStep(-1);
            return;
        }
        const sid = activeScheduleId;
        if (!sid) return;
        setSimulating(true);
        setSimStep(0);
        let step = 0;
        simIntervalRef.current = setInterval(() => {
            if (step >= MOCK_ROUTE.length) {
                clearInterval(simIntervalRef.current);
                simIntervalRef.current = null;
                setSimulating(false);
                setSimStep(-1);
                console.log('[Simulation] Trip complete — arrived at destination');
                return;
            }
            const coord = MOCK_ROUTE[step];
            console.log(`[Simulation] Step ${step + 1}/${MOCK_ROUTE.length}: [${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}] — ${coord.label}`);
            setCurrentLocation({ lat: coord.lat, lng: coord.lng });
            setSimStep(step);
            if (socketRef.current) {
                socketRef.current.emit('updateBusLocation', { scheduleId: sid, lat: coord.lat, lng: coord.lng });
            }
            step++;
        }, 3000);
    };

    /* cleanup on unmount */
    useEffect(() => () => {
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }, []);

    const reportDelay = async () => {
        if (!activeScheduleId) return;
        setDelaySubmitting(true);
        try {
            await axios.post(`/api/schedules/${activeScheduleId}/delay`,
                { delayMinutes: delayMinutes > 0 ? delayMinutes : 0, reason: delayReason },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setShowDelayForm(false);
            if (delayMinutes <= 0) setDelayInfo(null);
            else setDelayInfo({ delayMinutes, reason: delayReason, isActive: true });
        } catch (err) {
            console.error('Failed to report delay', err);
        } finally {
            setDelaySubmitting(false);
        }
    };

    /* active schedule — the one bus currently selected */
    const activeSchedule = useMemo(() => schedules.find(s => s._id === activeScheduleId) || schedules[0], [schedules, activeScheduleId]);

    /* populate delayInfo when activeSchedule changes */
    useEffect(() => {
        setDelayInfo(activeSchedule?.delayInfo?.isActive ? activeSchedule.delayInfo : null);
    }, [activeSchedule]);

    /* per-bus stats from active schedule only */
    const busSeats = activeSchedule?.seats || [];
    const liveStats = useMemo(() => {
        const totalSeats = busSeats.length;
        const bookedSeats = busSeats.filter(s => s.isBooked).length;
        const brokenSeats = busSeats.filter(s => s.isBroken).length;
        return { totalSeats, bookedSeats, brokenSeats, availableSeats: totalSeats - bookedSeats - brokenSeats };
    }, [busSeats]);
    const capacityPct = liveStats.totalSeats > 0 ? Math.round((liveStats.bookedSeats / liveStats.totalSeats) * 100) : 0;

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
                <Calendar size={40} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '1rem' }} />
                <h4 className="mb-2">No Assigned Trips</h4>
                <p className="text-light opacity-50">No buses assigned for today (Max limit: 3).</p>
            </div>
        );
    }

    /* ---------- Main render ---------- */
    const activeBus = activeSchedule?.bus;

    return (<>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        <div className="animate-fade-in">
            <h2 className="mb-4">Conductor Dashboard</h2>

            {/* Bus Selector Tabs */}
            <div className="glass-panel mb-3" style={{ padding: '0.65rem 1rem' }}>
                <div className="d-flex gap-2 flex-wrap">
                    {schedules.map(s => (
                        <button key={s._id}
                            onClick={() => setActiveScheduleId(s._id)}
                            className={`btn btn-sm px-3 py-1.5 rounded-lg fw-bold transition-all duration-200 ${
                                activeScheduleId === s._id
                                    ? 'bg-emerald-500 text-slate-950 border-0'
                                    : 'bg-transparent text-light border border-slate-700/60 opacity-60 hover:opacity-100'
                            }`}
                            style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {s.bus?.busNumber || 'Bus'} · {s.departureTime}
                        </button>
                    ))}
                </div>
            </div>

            {/* Per-Bus Live Passenger Counter */}
            {activeSchedule && (
            <div className="glass-panel mb-4" style={{ padding: '1rem 1.25rem' }}>
                <div className="row g-2 align-items-center">
                    <div className="col-md-7">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="text-light-emphasis" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                Active Bus: {activeBus?.busNumber || '—'} · {activeBus?.type || '—'}
                            </span>
                        </div>
                        <div className="d-flex gap-3 flex-wrap">
                            <div className="d-flex align-items-center gap-1.5">
                                <Users size={15} className="text-light-emphasis" />
                                <span className="text-light opacity-60" style={{ fontSize: '0.8rem' }}>Seats</span>
                                <strong className="text-light">{liveStats.totalSeats}</strong>
                            </div>
                            <div className="d-flex align-items-center gap-1.5">
                                <span className="legend-dot" style={{ background: 'var(--danger)', display: 'inline-block', width: 8, height: 8 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Booked</span>
                                <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{liveStats.bookedSeats}</strong>
                            </div>
                            <div className="d-flex align-items-center gap-1.5">
                                <span className="legend-dot" style={{ background: 'var(--success)', display: 'inline-block', width: 8, height: 8 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Available</span>
                                <strong style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{liveStats.availableSeats}</strong>
                            </div>
                            {liveStats.brokenSeats > 0 && (
                            <div className="d-flex align-items-center gap-1.5">
                                <span className="legend-dot" style={{ background: 'var(--warning)', display: 'inline-block', width: 8, height: 8 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Broken</span>
                                <strong style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>{liveStats.brokenSeats}</strong>
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="col-md-5 mt-2 mt-md-0">
                        <div className="d-flex align-items-center gap-2">
                            <Gauge size={16} style={{ color: 'var(--accent)' }} />
                            <div className="flex-grow-1" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${capacityPct}%`,
                                    height: '100%',
                                    background: capacityPct > 80 ? 'var(--danger)' : capacityPct > 50 ? 'var(--warning)' : 'var(--success)',
                                    borderRadius: 6,
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <strong className="text-light" style={{ minWidth: 40, textAlign: 'right', fontSize: '0.85rem' }}>{capacityPct}%</strong>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Single Active Schedule */}
            {activeSchedule && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div key={activeSchedule._id} className="conductor-card">
                    <div className="conductor-card-header">
                        <div>
                            <h5 className="mb-1">{activeSchedule.route?.name || 'N/A'}</h5>
                            <p className="text-light opacity-50 mb-0" style={{ fontSize: '0.85rem' }}>
                                Bus {activeBus?.busNumber} &middot; {activeBus?.type}
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            {delayInfo?.isActive && (
                                <span className="status-badge" style={{ background: '#78350f30', color: '#fbbf24', border: '1px solid #92400e' }}>
                                    <AlertTriangle size={12} className="me-1" />{delayInfo.delayMinutes} min delay
                                </span>
                            )}
                            <span className={`status-badge ${(activeBus?.status || 'Active') === 'Active' ? 'status-active' : 'status-broken'}`}>
                                {activeBus?.status || 'Active'}
                            </span>
                            <button
                                className="btn btn-sm"
                                style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                onClick={() => toggleBusStatus(activeBus?._id, activeBus?.status || 'Active')}
                                disabled={togglingBus === activeBus?._id}
                            >
                                {togglingBus === activeBus?._id
                                    ? '...'
                                    : `Report ${(activeBus?.status || 'Active') === 'Active' ? 'Broken' : 'Fixed'}`
                                }
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{
                                    background: tripStatus === 'inTransit' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)',
                                    border: `1px solid ${tripStatus === 'inTransit' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                                    color: tripStatus === 'inTransit' ? '#34d399' : '#60a5fa',
                                    fontSize: '0.78rem', whiteSpace: 'nowrap'
                                }}
                                onClick={() => {
                                    if (tripStatus === 'inTransit') {
                                        setTripStatus('ended');
                                    } else {
                                        setTripStatus('inTransit');
                                    }
                                }}
                            >
                                <Navigation size={12} className="me-1" />
                                {tripStatus === 'inTransit' ? 'Stop Tracking' : tripStatus === 'ended' ? 'Trip Ended' : 'Start Trip'}
                            </button>
                            {currentLocation && tripStatus === 'inTransit' && (
                                <span style={{ fontSize: '0.65rem', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    Live
                                </span>
                            )}
                            {simulating && (
                                <span style={{ fontSize: '0.65rem', color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    Sim {simStep + 1}/{MOCK_ROUTE.length}
                                </span>
                            )}
                            <button
                                className="btn btn-sm"
                                style={{
                                    background: simulating ? 'rgba(168,85,247,0.2)' : 'rgba(250,204,21,0.15)',
                                    border: `1px solid ${simulating ? 'rgba(168,85,247,0.3)' : 'rgba(250,204,21,0.3)'}`,
                                    color: simulating ? '#c084fc' : '#facc15',
                                    fontSize: '0.78rem', whiteSpace: 'nowrap'
                                }}
                                onClick={handleSimulateTrip}
                                disabled={tripStatus === 'inTransit'}
                                title={tripStatus === 'inTransit' ? 'Stop real tracking first' : 'Simulate a bus route'}
                            >
                                <Navigation size={12} className="me-1" />
                                {simulating ? 'Stop Simulation' : 'Simulate Trip'}
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{ background: delayInfo?.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.15)', fontSize: '0.78rem', whiteSpace: 'nowrap', border: `1px solid ${delayInfo?.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`, color: delayInfo?.isActive ? '#fca5a5' : '#fbbf24' }}
                                onClick={() => setShowDelayForm(!showDelayForm)}
                            >
                                <Clock size={12} className="me-1" />{delayInfo?.isActive ? 'Clear Delay' : 'Report Delay'}
                            </button>
                        </div>
                    </div>

                    {showDelayForm && (
                        <div className="bg-slate-950/60 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 mb-4">
                            <h4 className="text-amber-400/90 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Set Schedule Delay
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <input type="number" min={0} max={120} value={delayMinutes}
                                    onChange={e => setDelayMinutes(parseInt(e.target.value) || 0)}
                                    className="bg-slate-900 border border-slate-700 focus:border-amber-500 text-slate-100 rounded-xl px-4 py-2.5 w-24 text-center text-sm font-bold font-mono outline-none transition-all duration-200"
                                />
                                <span className="text-slate-400 text-sm">minutes delay</span>
                                {delayMinutes <= 0 && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg font-medium">clears delay</span>}
                            </div>
                            {delayMinutes > 0 && activeSchedule && (
                                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm font-mono mb-3 inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-slate-500 line-through">{activeSchedule.departureTime}</span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-emerald-400 font-extrabold tracking-wide">
                                        {(() => {
                                            const [h, m] = activeSchedule.departureTime.split(':').map(Number);
                                            const totalMin = h * 60 + m + delayMinutes;
                                            const newH = Math.floor(totalMin / 60) % 24;
                                            const newM = totalMin % 60;
                                            return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
                                        })()}
                                    </span>
                                </div>
                            )}
                            <input type="text" placeholder="Reason (e.g. traffic, breakdown)"
                                value={delayReason} onChange={e => setDelayReason(e.target.value)}
                                className="bg-slate-900 border border-slate-700 focus:border-amber-500 text-slate-100 rounded-xl px-4 py-2.5 w-full text-sm outline-none transition-all duration-200 mb-3 placeholder-slate-600"
                            />
                            <div className="flex items-center gap-3">
                                <button className="btn btn-sm"
                                    style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                                    onClick={reportDelay} disabled={delaySubmitting}>
                                    {delaySubmitting ? '...' : delayMinutes <= 0 ? 'Clear Delay' : 'Report Delay'}
                                </button>
                                <button className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                                    onClick={() => setShowDelayForm(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    <div className="conductor-card-meta">
                        {delayInfo?.isActive && delayInfo.delayMinutes > 0 ? (
                            <span>Departs at <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.75rem' }}>{activeSchedule.departureTime}</span> <span style={{ color: '#4ade80', fontWeight: 700 }}>{(() => { const [h,m]=activeSchedule.departureTime.split(':').map(Number); const t = h*60+m+delayInfo.delayMinutes; return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; })()}</span></span>
                        ) : (
                            <span>Departs at {activeSchedule.departureTime}</span>
                        )}
                        <span>Fare: Rs. {parseFloat(activeSchedule.fare || 0).toFixed(2)}{activeSchedule.isPeakHour && <span className="ms-1 text-xs text-amber-400">★ Peak</span>}</span>
                    </div>

                    <div className="seat-legend">
                        <span className="legend-dot" style={{ background: 'var(--success)' }} /> Available
                        <span className="legend-dot" style={{ background: 'var(--danger)' }} /> Booked
                        <span className="legend-dot" style={{ background: 'var(--warning)' }} /> Broken
                    </div>

                    {renderSeatGrid(activeSchedule)}

                    <div className="seat-summary">
                        <span>Total: {busSeats.length}</span>
                        <span style={{ color: 'var(--success)' }}>
                            Available: {busSeats.filter(s => !s.isBooked && !s.isBroken).length || 0}
                        </span>
                        <span style={{ color: 'var(--danger)' }}>
                            Booked: {busSeats.filter(s => s.isBooked).length || 0}
                        </span>
                        <span style={{ color: 'var(--warning)' }}>
                            Broken: {busSeats.filter(s => s.isBroken).length || 0}
                        </span>
                    </div>
                </div>
            </div>
            )}
        </div>
    </>
    );
}
