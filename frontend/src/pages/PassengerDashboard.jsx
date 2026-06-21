import { Routes, Route } from 'react-router-dom';
import BookSeat from '../components/BookSeat';
import MyBookings from '../components/MyBookings';

export default function PassengerDashboard() {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ 
                position: 'relative',
                borderRadius: '16px', 
                padding: '3rem 2rem', 
                marginBottom: '2rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                overflow: 'hidden',
                minHeight: '200px'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'url(/passenger-banner.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 0
                }}></div>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 100%)',
                    zIndex: 1
                }}></div>

                <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
                    <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Passenger Dashboard</h2>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Manage your bookings, discover new routes, and enjoy a premium travel experience.</p>
                </div>
            </div>
            
            <Routes>
                <Route path="/" element={<MyBookings />} />
                <Route path="/book/:scheduleId" element={<BookSeat />} />
            </Routes>
        </div>
    );
}

