import { useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useAuthStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            login(res.data);
            if (res.data.role === 'admin') navigate('/admin');
            else if (res.data.role === 'conductor') navigate('/conductor');
            else navigate('/passenger');
        } catch (error) {
            alert(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            width: '100vw',
            margin: '0', 
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '1rem',
            backgroundImage: 'url(/ticket-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            {/* Dark overlay to make the card stand out */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)' }}></div>
            
            <div className="glass-panel animate-fade-in" style={{ zIndex: 1, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', maxWidth: '900px', width: '100%', padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                {/* Left Side: Image */}
                <div style={{ flex: '1 1 400px', position: 'relative', minHeight: '400px' }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: 'url(/login-bg.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.9))',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Smart Bus System</h2>
                        <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Experience the future of urban mobility with our state-of-the-art electric transit network.</p>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div style={{ flex: '1 1 350px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-primary)' }}>Welcome Back</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Login</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
