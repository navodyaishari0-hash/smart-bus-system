import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import BusiestTimes from './BusiestTimes';
import SeatPreference from './SeatPreference';

export default function AnalyticsDashboard() {
    const [bookingTrends, setBookingTrends] = useState(null);
    const [seatPref, setSeatPref] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState('');
    const { user, logout } = useAuthStore();

    const fetchAnalytics = useCallback(async () => {
        const token = user?.token;
        if (!token) {
            setError('You must be logged in as admin to view analytics.');
            setLoading(false);
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        setLoading(true);
        setError(null);
        try {
            const [trendsRes, seatRes] = await Promise.all([
                axios.get('/api/analytics/booking-trends', { headers }),
                axios.get('/api/analytics/seat-preferences', { headers })
            ]);
            setBookingTrends(trendsRes.data);
            setSeatPref(seatRes.data);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            if (err.response?.status === 401) {
                setError('Session expired. Please log in again.');
                logout();
                return;
            }
            setError(msg);
            console.error('Analytics fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [user?.token, logout]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const handleSeedDemo = async () => {
        if (!confirm('Generate 1500+ demo bookings for analytics charts? This may take a moment.')) return;
        const token = user?.token;
        if (!token) {
            setSeedMsg('Error: Not logged in.');
            return;
        }
        setSeeding(true);
        setSeedMsg('');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.post('/api/analytics/generate-demo', {}, { headers });
            setSeedMsg(res.data.message || 'Done!');
            fetchAnalytics();
        } catch (err) {
            if (err.response?.status === 401) {
                setSeedMsg('Session expired. Please log in again.');
                logout();
                return;
            }
            setSeedMsg('Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setSeeding(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{
                    width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#3b82f6', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading analytics…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error && !bookingTrends && !seatPref) {
        const isAuthError = error.includes('log in') || error.includes('login') || error.includes('token');
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load analytics.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
                {isAuthError ? (
                    <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>
                        Go to Login
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={fetchAnalytics}>Retry</button>
                )}
            </div>
        );
    }

    const hasBookingData = bookingTrends?.hourly?.some(h => h.count > 0)
        || bookingTrends?.weekly?.some(w => w.count > 0);
    const hasSeatData = seatPref?.seatRanking?.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem'
            }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {hasBookingData || hasSeatData
                            ? 'Analytics data loaded from database.'
                            : 'No analytics data yet. Generate demo data to see charts.'}
                    </p>
                    {seedMsg && (
                        <p style={{
                            margin: '0.25rem 0 0 0', fontSize: '0.8rem',
                            color: seedMsg.startsWith('Error') ? 'var(--danger)' : 'var(--accent-primary)'
                        }}>
                            {seedMsg}
                        </p>
                    )}
                    {error && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--warning)' }}>
                            {error}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={handleSeedDemo}
                    disabled={seeding}
                >
                    {seeding && (
                        <span style={{
                            width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite', display: 'inline-block'
                        }} />
                    )}
                    {seeding ? 'Generating…' : 'Generate Demo Bookings'}
                </button>
            </div>

            <BusiestTimes
                hourly={bookingTrends?.hourly || []}
                weekly={bookingTrends?.weekly || []}
                routePopularity={bookingTrends?.routePopularity || []}
            />

            <SeatPreference
                position={seatPref?.position}
                zone={seatPref?.zone}
                seatRanking={seatPref?.seatRanking || []}
            />
        </div>
    );
}
