import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import useAuthStore from '../store/authStore';
import { X, Bell } from 'lucide-react';

export default function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notif, setNotif] = useState(null);
    const timerRef = useRef(null);
    const { user, logout } = useAuthStore();

    useEffect(() => {
        fetchBookings();
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('newBookingAlert', (data) => {
            console.log('🔔 Socket notification received!', data);
            setNotif(data);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setNotif(null), 5000);
        });
        return () => { socket.disconnect(); if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/bookings', {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setBookings(res.data);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                return;
            }
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const dismissNotif = () => {
        setNotif(null);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    if (loading) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{
                    width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#3b82f6', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading bookings…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load bookings.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
                <button className="btn btn-primary" onClick={fetchBookings}>Retry</button>
            </div>
        );
    }

    return (
        <>
            {/* Toast notification */}
            {notif && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    maxWidth: 380, width: '100%',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(59,130,246,0.95))',
                    backdropFilter: 'blur(12px)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '1rem 1.25rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <Bell size={20} style={{ color: 'white', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                                {notif.message}
                            </p>
                            {notif.booking && (
                                <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                    {notif.booking.routeName && <div>Route: {notif.booking.routeName}</div>}
                                    <div>{notif.booking.startStop} → {notif.booking.endStop}</div>
                                    <div>Seats: {Array.isArray(notif.booking.seats) ? notif.booking.seats.join(', ') : notif.booking.seats}</div>
                                    <div style={{ fontWeight: 600 }}>Rs. {(notif.booking.totalFare || 0).toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                        <button onClick={dismissNotif} style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
                            color: 'white', cursor: 'pointer', padding: '0.2rem 0.4rem',
                            display: 'flex', alignItems: 'center', flexShrink: 0
                        }}>
                            <X size={14} />
                        </button>
                    </div>
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem'
                }}>
                    <h3 style={{ margin: 0 }}>All Bookings ({bookings.length})</h3>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={fetchBookings}>
                        Refresh
                    </button>
                </div>

                {bookings.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No bookings have been made yet.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
                            minWidth: '800px'
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Passenger</th>
                                    <th style={thStyle}>Bus</th>
                                    <th style={thStyle}>Route</th>
                                    <th style={thStyle}>Date & Time</th>
                                    <th style={thStyle}>Seats</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Fare</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b, i) => {
                                    const busNum = b.schedule?.bus?.busNumber || 'N/A';
                                    const routeName = b.schedule?.route?.name || 'N/A';
                                    const depDate = b.schedule?.departureDate
                                        ? new Date(b.schedule.departureDate).toLocaleDateString()
                                        : 'N/A';
                                    const depTime = b.schedule?.departureTime || 'N/A';
                                    const seats = Array.isArray(b.seatsBooked) ? b.seatsBooked.join(', ') : b.seatsBooked || 'N/A';
                                    const passengerEmail = b.passenger?.email || 'N/A';
                                    const statusColor = b.status === 'Confirmed'
                                        ? 'var(--success)' : b.status === 'Cancelled'
                                        ? 'var(--danger)' : 'var(--warning)';
                                    const statusBg = b.status === 'Confirmed'
                                        ? 'rgba(16,185,129,0.15)' : b.status === 'Cancelled'
                                        ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';

                                    return (
                                        <tr key={b._id || b.id} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background 0.2s'
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={tdStyle}>{i + 1}</td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    {b.passenger?.name && (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                            {b.passenger.name}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {passengerEmail}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    background: 'rgba(59,130,246,0.1)', color: '#93c5fd',
                                                    padding: '0.2rem 0.5rem', borderRadius: '4px',
                                                    fontSize: '0.8rem', fontFamily: 'monospace'
                                                }}>
                                                    {busNum}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                        {b.startStop} <span style={{ color: 'var(--text-secondary)' }}>→</span> {b.endStop}
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                        {routeName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    {depDate}
                                                </span>
                                                <br />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {depTime}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    background: 'rgba(139,92,246,0.1)', color: '#c4b5fd',
                                                    padding: '0.15rem 0.4rem', borderRadius: '4px',
                                                    fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap'
                                                }}>
                                                    {seats}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                                Rs. {b.totalFare?.toLocaleString() || '0'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '12px',
                                                    fontSize: '0.7rem', fontWeight: 600,
                                                    background: statusBg, color: statusColor,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {b.status || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

const thStyle = {
    padding: '0.75rem 0.75rem',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '0.75rem 0.75rem',
    color: 'var(--text-primary)',
    verticalAlign: 'middle'
};
