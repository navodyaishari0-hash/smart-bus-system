import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function AdminDashboard() {
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [conductors, setConductors] = useState([]);
    const [showBusForm, setShowBusForm] = useState(false);
    
    // New Bus Form State
    const [busNumber, setBusNumber] = useState('');
    const [capacity, setCapacity] = useState(40);
    const [busType, setBusType] = useState('Standard');
    const [busPhoto, setBusPhoto] = useState('');
    const [selectedConductor, setSelectedConductor] = useState('');

    const { user } = useAuthStore();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const resBuses = await axios.get('http://localhost:5000/api/buses');
            const resRoutes = await axios.get('http://localhost:5000/api/routes');
            const resConductors = await axios.get('http://localhost:5000/api/auth/conductors', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setBuses(resBuses.data);
            setRoutes(resRoutes.data);
            setConductors(resConductors.data);
            if (resConductors.data.length > 0) setSelectedConductor(resConductors.data[0]._id);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleBusStatus = async (busId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Broken' : 'Active';
            await axios.patch(`http://localhost:5000/api/buses/${busId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleAddBus = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/buses', {
                busNumber,
                capacity,
                type: busType,
                conductor: selectedConductor,
                photo: busPhoto
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setShowBusForm(false);
            setBusNumber('');
            setCapacity(40);
            setBusType('Standard');
            setBusPhoto('');
            fetchData(); // Refresh buses
        } catch (error) {
            console.error('Failed to add bus', error);
            alert('Failed to add bus');
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>Super Admin Dashboard</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Manage fleet, routes, and personnel from your command center.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Manage Buses Panel */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🚌 Manage Buses</h3>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Fleet: <strong style={{ color: 'var(--text-primary)' }}>{buses.length}</strong></p>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowBusForm(!showBusForm)}>
                            {showBusForm ? '✕ Close' : '+ Add Bus'}
                        </button>
                    </div>

                    {showBusForm && (
                        <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
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
                                        {conductors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>✓ Save Bus to Fleet</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {buses.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No buses registered.</p> : buses.map(bus => (
                            <div key={bus._id} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.3s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#2d3748' }}>
                                        <img src={bus.photo || '/bus-placeholder.svg'} alt={bus.busNumber} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0' }}>{bus.busNumber}</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bus.type} • Capacity: {bus.capacity}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                                        background: bus.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: bus.status === 'Active' ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        ● {bus.status || 'Active'}
                                    </span>
                                    <button 
                                        onClick={() => toggleBusStatus(bus._id, bus.status || 'Active')}
                                        style={{ 
                                            background: 'none', border: 'none', color: 'var(--text-secondary)', 
                                            fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' 
                                        }}
                                    >
                                        Mark {bus.status === 'Active' ? 'Broken' : 'Active'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manage Routes Panel */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🗺️ Manage Routes</h3>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Routes: <strong style={{ color: 'var(--text-primary)' }}>{routes.length}</strong></p>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => alert('Add Route dialog (placeholder)')}>
                            + Add Route
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {routes.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No routes created.</p> : routes.map(route => (
                            <div key={route._id} style={{ 
                                padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                            }}>
                                <h4 style={{ margin: 0, color: 'var(--accent-primary)' }}>{route.name}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{route.origin}</span>
                                    <span>→</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{route.destination}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
