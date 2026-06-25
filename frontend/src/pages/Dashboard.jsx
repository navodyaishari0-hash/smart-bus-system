import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BusFront, Ticket, Settings, Users, Route, Calendar, LayoutDashboard, LogOut } from 'lucide-react';

import AdminDashboard from './AdminDashboard';
import ConductorDashboard from './ConductorDashboard';
import MyBookings from '../components/MyBookings';

const roleConfig = {
    admin:    { label: 'Admin',     color: '#3b82f6', icon: Settings },
    conductor:{ label: 'Conductor', color: '#f59e0b', icon: BusFront },
    passenger:{ label: 'Passenger', color: '#10b981', icon: Ticket }
};

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) navigate('/login', { replace: true });
    }, [user, navigate]);

    if (!user) return null;

    const role = user.role;
    const cfg = roleConfig[role] || roleConfig.passenger;
    const Icon = cfg.icon;

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
            {/* -------- Top Bar -------- */}
            <div className="glass-panel" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <LayoutDashboard size={22} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Dashboard</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {user.name || user.email}
                    </span>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.2rem 0.7rem', borderRadius: 999,
                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                        background: `${cfg.color}20`, color: cfg.color,
                        border: `1px solid ${cfg.color}40`
                    }}>
                        <Icon size={12} />
                        {cfg.label}
                    </span>
                    <button
                        onClick={logout}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.35rem 0.9rem', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600
                        }}
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            </div>

            {/* -------- Role-specific content -------- */}
            {role === 'admin' && <AdminDashboard />}
            {role === 'conductor' && <ConductorDashboard />}
            {role === 'passenger' && (
                <div>
                    <div className="glass-panel" style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.05))',
                        border: '1px solid rgba(16,185,129,0.2)', marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <Ticket size={22} color="var(--success)" />
                            <h3 style={{ margin: 0 }}>My Bookings</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                            View and manage your upcoming trips.
                        </p>
                    </div>
                    <MyBookings />
                </div>
            )}
        </div>
    );
}
