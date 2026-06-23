import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookSeatsPage from './pages/BookSeatsPage';
import PassengerDashboard from './pages/PassengerDashboard';
import ConductorDashboard from './pages/ConductorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { BusFront } from 'lucide-react';
import useAuthStore from './store/authStore';

function App() {
  const { user, logout } = useAuthStore();

  return (
    <div className="container">
      <nav className="navbar animate-fade-in">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <BusFront size={32} color="var(--accent-primary)" />
          <h2 style={{ marginBottom: 0 }}>SmartBus</h2>
        </Link>
        <div className="nav-links">
          <Link to="/">Search Buses</Link>
          {user ? (
            <>
              {user.role === 'passenger' && <Link to="/passenger">Dashboard</Link>}
              {user.role === 'conductor' && <Link to="/conductor">Dashboard</Link>}
              {user.role === 'admin' && <Link to="/admin">Dashboard</Link>}
              <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ marginLeft: '2rem' }}>Register</Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book-seats/:scheduleId" element={<BookSeatsPage />} />
        <Route path="/passenger/*" element={<PassengerDashboard />} />
        <Route path="/conductor/*" element={<ConductorDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

export default App;

