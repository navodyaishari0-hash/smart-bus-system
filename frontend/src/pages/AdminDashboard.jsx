import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { Bell, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AnalyticsDashboard from '../components/Analytics/AnalyticsDashboard';
import AdminBookings from './AdminBookings';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => { if (!user?.token) navigate('/login'); }, [user, navigate]);

    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [conductors, setConductors] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState('buses');
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('newBookingAlert', (data) => {
            console.log('🔔 Socket notification received!', data);
            setNotifications(prev => [data, ...prev]);
        });
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifPanel(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Bus form
    const [showBusForm, setShowBusForm] = useState(false);
    const [busNumber, setBusNumber] = useState('');
    const [capacity, setCapacity] = useState(40);
    const [busType, setBusType] = useState('Standard');
    const [busPhoto, setBusPhoto] = useState('');
    const [selectedConductor, setSelectedConductor] = useState('');

    // Route form
    const [showRouteForm, setShowRouteForm] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeStops, setRouteStops] = useState('');
    const [routeDistance, setRouteDistance] = useState('');
    const [routeDuration, setRouteDuration] = useState('');

    // Schedule form
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [schedBus, setSchedBus] = useState('');
    const [schedRoute, setSchedRoute] = useState('');
    const [schedDate, setSchedDate] = useState('');
    const [schedTime, setSchedTime] = useState('');
    const [schedFare, setSchedFare] = useState('');

    // Conductor form
    const [showConductorForm, setShowConductorForm] = useState(false);
    const [condName, setCondName] = useState('');
    const [condEmail, setCondEmail] = useState('');
    const [condPassword, setCondPassword] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [resBuses, resRoutes, resSchedules] = await Promise.all([
                axios.get('/api/buses'),
                axios.get('/api/routes'),
                axios.get('/api/schedules')
            ]);
            setBuses(resBuses.data || []);
            setRoutes(resRoutes.data || []);
            setSchedules(resSchedules.data || []);
        } catch (error) {
            console.error(error);
        }
        try {
            const resConductors = await axios.get('/api/auth/conductors');
            setConductors(resConductors.data || []);
            if (resConductors.data?.length > 0 && !selectedConductor) setSelectedConductor(resConductors.data[0]._id);
        } catch (error) {
            console.error('Failed to fetch conductors', error);
        }
        setLoadingData(false);
    };

    const toggleBusStatus = async (busId, currentStatus) => {
        try {
            const statusCycle = { Active: 'Broken', Broken: 'Maintenance', Maintenance: 'Active' };
            await axios.patch(`/api/buses/${busId}/status`, { status: statusCycle[currentStatus] || 'Active' }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleAddBus = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/buses', {
                busNumber, capacity, type: busType, conductor: selectedConductor, photo: busPhoto
            }, { headers: { Authorization: `Bearer ${user.token}` } });
            setShowBusForm(false);
            setBusNumber(''); setCapacity(40); setBusType('Standard'); setBusPhoto('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add bus');
        }
    };

    const handleDeleteBus = async (busId) => {
        if (!confirm('Delete this bus permanently?')) return;
        try {
            await axios.delete(`/api/buses/${busId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleAddRoute = async (e) => {
        e.preventDefault();
        const stopsArr = routeStops.split(',').map(s => s.trim()).filter(Boolean);
        if (stopsArr.length < 2) return alert('Enter at least 2 stops separated by commas');
        try {
            await axios.post('/api/routes', {
                name: routeName, stops: routeStops, distance: parseFloat(routeDistance), estimatedDuration: routeDuration
            }, { headers: { Authorization: `Bearer ${user.token}` } });
            setShowRouteForm(false);
            setRouteName(''); setRouteStops(''); setRouteDistance(''); setRouteDuration('');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add route');
        }
    };

    const handleDeleteRoute = async (routeId) => {
        if (!confirm('Delete this route permanently?')) return;
        try {
            await axios.delete(`/api/routes/${routeId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/schedules', {
                bus: schedBus, route: schedRoute, departureDate: schedDate, departureTime: schedTime, fare: parseFloat(schedFare)
            }, { headers: { Authorization: `Bearer ${user.token}` } });
            setShowScheduleForm(false);
            setSchedBus(''); setSchedRoute(''); setSchedDate(''); setSchedTime(''); setSchedFare('');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add schedule');
        }
    };

    const handleAddConductor = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auth/register', { name: condName, email: condEmail, password: condPassword, role: 'conductor' }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setShowConductorForm(false);
            alert(`✅ Conductor added!\n\nName: ${condName}\nEmail: ${condEmail}\nPassword: ${condPassword}`);
            setCondName(''); setCondEmail(''); setCondPassword('');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add conductor');
        }
    };

    const handleAssignConductor = async (busId, conductorId) => {
        try {
            await axios.patch(`/api/buses/${busId}`, { conductor: conductorId || '' }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to assign conductor');
        }
    };

    const Skeleton = ({ lines = 3 }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} style={{
                    height: '4.5rem', borderRadius: '12px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    border: '1px solid rgba(255,255,255,0.04)'
                }} />
            ))}
        </div>
    );

    const statusColor = (status) => {
        switch (status) {
            case 'Active': return 'var(--success)';
            case 'Broken': return 'var(--danger)';
            case 'Maintenance': return 'var(--warning)';
            default: return 'var(--text-secondary)';
        }
    };
    const statusBg = (status) => {
        switch (status) {
            case 'Active': return 'rgba(16, 185, 129, 0.15)';
            case 'Broken': return 'rgba(239, 68, 68, 0.15)';
            case 'Maintenance': return 'rgba(245, 158, 11, 0.15)';
            default: return 'rgba(255,255,255,0.05)';
        }
    };

    const tabStyle = (tab) => ({
        padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
        background: activeTab === tab ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
        color: activeTab === tab ? 'white' : 'var(--text-secondary)',
        transition: 'all 0.3s',
        boxShadow: activeTab === tab ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none'
    });

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: 0 }}>Admin Dashboard</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Manage fleet, routes, schedules, and personnel.</p>
                </div>
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button onClick={() => setShowNotifPanel(prev => !prev)} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px',
                        padding: '0.6rem', cursor: 'pointer', position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    >
                        <Bell size={22} style={{ color: 'var(--text-primary)' }} />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#ef4444', color: 'white',
                                fontSize: '0.65rem', fontWeight: 700,
                                minWidth: '18px', height: '18px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%', padding: '0 4px',
                                boxShadow: '0 2px 8px rgba(239,68,68,0.5)'
                            }}>
                                {notifications.length > 99 ? '99+' : notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotifPanel && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                            width: '380px', maxHeight: '420px',
                            background: 'rgba(15,23,42,0.97)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            zIndex: 9999, overflow: 'hidden',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                    Notifications ({notifications.length})
                                </span>
                                {notifications.length > 0 && (
                                    <button onClick={() => setNotifications([])}
                                        style={{
                                            background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px',
                                            color: '#f87171', cursor: 'pointer', fontSize: '0.75rem',
                                            padding: '0.3rem 0.7rem', fontWeight: 600,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        No new notifications
                                    </div>
                                ) : notifications.map((n, i) => (
                                    <div key={i} style={{
                                        padding: '0.85rem 1.25rem',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        transition: 'background 0.2s'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <span style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: '#3b82f6', flexShrink: 0, marginTop: '6px'
                                            }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {n.message}
                                                </p>
                                                {n.booking && (
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                        {n.booking.routeName && <span>{n.booking.routeName}</span>}
                                                        {n.booking.startStop && n.booking.endStop && (
                                                            <span> &middot; {n.booking.startStop} → {n.booking.endStop}</span>
                                                        )}
                                                        <br />
                                                        <span style={{ color: '#94a3b8' }}>
                                                            Seats: {Array.isArray(n.booking.seats) ? n.booking.seats.join(', ') : n.booking.seats}
                                                            {n.booking.totalFare && <> &middot; Rs. {n.booking.totalFare.toLocaleString()}</>}
                                                        </span>
                                                        {n.booking.time && (
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                                                                {new Date(n.booking.time).toLocaleTimeString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button style={tabStyle('buses')} onClick={() => setActiveTab('buses')}>Buses ({buses.length})</button>
                <button style={tabStyle('routes')} onClick={() => setActiveTab('routes')}>Routes ({routes.length})</button>
                <button style={tabStyle('schedules')} onClick={() => setActiveTab('schedules')}>Schedules ({schedules.length})</button>
                <button style={tabStyle('conductors')} onClick={() => setActiveTab('conductors')}>Conductors ({conductors.length})</button>
                <button style={tabStyle('analytics')} onClick={() => setActiveTab('analytics')}>Analytics</button>
                <button style={tabStyle('bookings')} onClick={() => setActiveTab('bookings')}>Bookings</button>
            </div>

            {activeTab === 'buses' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Manage Buses</h3>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowBusForm(!showBusForm)}>
                            {showBusForm ? 'Cancel' : '+ Add Bus'}
                        </button>
                    </div>

                    {showBusForm && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Add New Bus</h4>
                            <form onSubmit={handleAddBus} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <input type="text" placeholder="Bus Number (e.g. WP-ND-1234)" value={busNumber} onChange={e => setBusNumber(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="number" placeholder="Capacity" value={capacity} onChange={e => setCapacity(e.target.value)} required />
                                </div>
                                <div>
                                    <select value={busType} onChange={e => setBusType(e.target.value)}>
                                        <option value="Standard">Standard</option>
                                        <option value="AC">AC</option>
                                        <option value="Luxury">Luxury</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <input type="text" placeholder="Photo URL (optional)" value={busPhoto} onChange={e => setBusPhoto(e.target.value)} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <select value={selectedConductor} onChange={e => setSelectedConductor(e.target.value)} required>
                                        <option value="">Select Conductor</option>
                                        {conductors.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Save Bus</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingData ? (
                            <Skeleton lines={4} />
                        ) : !buses?.length ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                                No buses registered. Click "+ Add Bus" to get started.
                            </p>
                        ) : buses?.map(bus => (
                            <div key={bus?._id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', background: '#2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                        {bus?.photo
                                    ? <img src={bus.photo} alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '🚌'; }}
                                    />
                                    : '🚌'}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0' }}>{bus?.busNumber || `Bus #${bus?._id}`}</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {bus?.type || 'Standard'} &middot; Cap: {bus?.capacity ?? '?'}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                                            <select value={bus?.conductor?._id || bus?.conductorId || ''} onChange={e => handleAssignConductor(bus._id, e.target.value)}
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}>
                                                <option value="">No Conductor</option>
                                                {conductors?.map(c => <option key={c?._id} value={c?._id}>{c?.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                                        background: statusBg(bus?.status), color: statusColor(bus?.status)
                                    }}>
                                        {bus?.status || 'Active'}
                                    </span>
                                    <button onClick={() => toggleBusStatus(bus._id, bus?.status || 'Active')}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Cycle Status
                                    </button>
                                    <button onClick={() => handleDeleteBus(bus._id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'routes' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Manage Routes</h3>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowRouteForm(!showRouteForm)}>
                            {showRouteForm ? 'Cancel' : '+ Add Route'}
                        </button>
                    </div>

                    {showRouteForm && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Add New Route</h4>
                            <form onSubmit={handleAddRoute} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <input type="text" placeholder="Route Name (e.g. Colombo to Galle)" value={routeName} onChange={e => setRouteName(e.target.value)} required />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <input type="text" placeholder="Stops (comma-separated, e.g. Colombo, Galle, Matara)" value={routeStops} onChange={e => setRouteStops(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="number" step="0.1" placeholder="Distance (km)" value={routeDistance} onChange={e => setRouteDistance(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="text" placeholder="Duration (e.g. 2h 30m)" value={routeDuration} onChange={e => setRouteDuration(e.target.value)} required />
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Save Route</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingData ? (
                            <Skeleton lines={4} />
                        ) : !routes?.length ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                                No routes created. Click "+ Add Route" to get started.
                            </p>
                        ) : routes?.map(route => (
                            <div key={route?._id} style={{
                                padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-primary)' }}>{route?.name || `Route #${route?._id}`}</h4>
                                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                                        <strong>{route?.stops?.[0] || '?'}</strong> &rarr; <strong>{route?.stops?.[route?.stops?.length - 1] || '?'}</strong>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {route?.stops?.length || 0} stops &middot; {route?.distance || '?'} km &middot; {route?.estimatedDuration || route?.estimated_duration || '?'}
                                    </p>
                                </div>
                                <button onClick={() => handleDeleteRoute(route?._id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.5rem 1rem' }}>
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'conductors' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Conductors ({conductors.length})</h3>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowConductorForm(!showConductorForm)}>
                            {showConductorForm ? 'Cancel' : '+ Add Conductor'}
                        </button>
                    </div>

                    {showConductorForm && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Register New Conductor</h4>
                            <form onSubmit={handleAddConductor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <input type="text" placeholder="Full Name" value={condName} onChange={e => setCondName(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="email" placeholder="Email" value={condEmail} onChange={e => setCondEmail(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="text" placeholder="Password" value={condPassword} onChange={e => setCondPassword(e.target.value)} required minLength={4} />
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Register Conductor</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {loadingData ? (
                            <Skeleton lines={4} />
                        ) : !conductors?.length ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No conductors registered.</p>
                        ) : conductors?.map(c => (
                            <div key={c?._id} style={{
                                padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.04)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', minWidth: '2rem' }}>#{c?._id}</span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{c?.name || 'Unknown'}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c?.email || '—'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <code style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                                        pass123
                                    </code>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                                        conductor
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'bookings' && <AdminBookings />}

            {activeTab === 'schedules' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Manage Schedules</h3>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowScheduleForm(!showScheduleForm)}>
                            {showScheduleForm ? 'Cancel' : '+ Add Schedule'}
                        </button>
                    </div>

                    {showScheduleForm && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Add New Schedule</h4>
                            <form onSubmit={handleAddSchedule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <select value={schedBus} onChange={e => setSchedBus(e.target.value)} required>
                                        <option value="">Select Bus</option>
                                        {buses.filter(b => b.status !== 'Broken').map(b => <option key={b._id} value={b._id}>{b.busNumber} ({b.type})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select value={schedRoute} onChange={e => setSchedRoute(e.target.value)} required>
                                        <option value="">Select Route</option>
                                        {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} required />
                                </div>
                                <div>
                                    <input type="number" step="10" placeholder="Fare (Rs.)" value={schedFare} onChange={e => setSchedFare(e.target.value)} required />
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Create Schedule</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingData ? (
                            <Skeleton lines={4} />
                        ) : !schedules?.length ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No schedules created.</p>
                        ) : schedules.slice().reverse().map(sched => (
                            <div key={sched?._id} style={{
                                padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center'
                            }}>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
                                        {sched?.route?.name || `Route #${sched?.routeId}`}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {sched?.bus?.busNumber || `Bus #${sched?.busId}`} &middot;
                                        {sched?.departureDate?.split?.('T')?.[0] || '—'} at {sched?.departureTime || '—'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                                        Rs. {sched?.fare ?? '?'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {sched?.seats?.length || 0} seats
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
