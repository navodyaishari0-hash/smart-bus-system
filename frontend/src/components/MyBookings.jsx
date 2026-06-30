import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Clock, AlertTriangle } from 'lucide-react';

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;
        axios.get('/api/bookings/mybookings', { headers: { Authorization: `Bearer ${user.token}` } })
            .then(res => setBookings(res.data))
            .catch(err => { console.error(err); setFetchError(err.response?.data?.message || 'Failed to load bookings'); });
    }, [user]);

    const delayBadge = (booking) => {
        const dl = booking.delayInfo;
        if (!dl || !dl.delayMinutes) {
            return (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    On Time
                </span>
            );
        }
        return (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5">
                <AlertTriangle size={11} /> {dl.delayMinutes} min delay
            </span>
        );
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>My Trips</h3>
                <button className="btn btn-primary" onClick={() => window.location.href = '/'}
                    style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                    Book New Ticket
                </button>
            </div>

            {fetchError && (
                <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.15)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {fetchError}
                </div>
            )}

            {bookings.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎫</div>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No bookings yet</h3>
                    <p style={{ color: 'var(--text-secondary)', opacity: 0.7, fontSize: '0.85rem' }}>Your upcoming trips will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {bookings.map(booking => (
                        <div key={booking._id} className="glass-panel"
                            style={{
                                padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                                position: 'relative', overflow: 'hidden', transition: 'transform 0.2s ease',
                                cursor: 'pointer', borderRadius: '16px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', borderRadius: '0 4px 4px 0', background: booking.delayInfo?.delayMinutes ? 'var(--warning)' : 'var(--success)' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.15rem 0', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                                        {booking.schedule?.route?.name}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Bus: {booking.schedule?.bus?.busNumber}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                    {delayBadge(booking)}
                                    <span style={{
                                        background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)',
                                        padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem',
                                        fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid rgba(16,185,129,0.3)'
                                    }}>
                                        {booking.status}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                                background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px'
                            }}>
                                <div>
                                    <p className="text-slate-500 text-[0.65rem] tracking-widest uppercase font-semibold mb-1">Departure</p>
                                    <p className="text-slate-200 text-sm font-semibold">{booking.schedule?.departureDate?.split('T')[0]}</p>
                                    {booking.delayInfo?.delayMinutes ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-slate-500 line-through text-sm">{booking.delayInfo.originalDepartureTime}</span>
                                            <span className="text-emerald-400 font-extrabold text-lg tracking-wide font-mono">{booking.delayInfo.newDepartureTime}</span>
                                        </div>
                                    ) : (
                                        <p className="text-slate-100 text-base font-bold mt-0.5">{booking.schedule?.departureTime}</p>
                                    )}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>SEATS</p>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                        {Array.isArray(booking.seatsBooked) ? booking.seatsBooked.join(', ') : ''}
                                    </p>
                                </div>
                                {booking.delayInfo?.delayMinutes && (
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>DELAY INFO</p>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.75rem', color: '#fbbf24' }}>
                                            {booking.delayInfo.delayMinutes} min{booking.delayInfo.reason ? ` — ${booking.delayInfo.reason}` : ''}
                                        </p>
                                    </div>
                                )}
                                {booking.discountType && booking.discountType !== 'none' && (
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>DISCOUNT</p>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.8rem', color: '#10b981' }}>
                                            {booking.discountType} ({booking.discountPercentage}%)
                                        </p>
                                    </div>
                                )}
                                {booking.emergencyName && (
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>EMERGENCY CONTACT</p>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                            {booking.emergencyName}{booking.emergencyPhone ? ` (${booking.emergencyPhone})` : ''}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {booking.delayInfo?.delayMinutes && (
                                <div className="bg-amber-500/5 border-l-4 border-amber-500 text-amber-300 p-3 text-xs md:text-sm rounded-r-xl flex items-center gap-2 mt-2">
                                    <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                                    <span>
                                        Delayed by <strong className="text-amber-200">{booking.delayInfo.delayMinutes} min</strong>
                                        {booking.delayInfo.reason ? ` — ${booking.delayInfo.reason}` : ''}.
                                        {' '}New departure: <strong className="text-emerald-400">{booking.delayInfo.newDepartureTime}</strong>
                                        {' '}<span className="text-slate-600">(was {booking.delayInfo.originalDepartureTime})</span>
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Fare</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Rs. {booking.totalFare}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
