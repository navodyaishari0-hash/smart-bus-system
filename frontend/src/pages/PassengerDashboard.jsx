import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import useAuthStore from '../store/authStore';
import BookSeat from '../components/BookSeat';
import MyBookings from '../components/MyBookings';
import LiveMap from '../components/LiveMap';
import DelayNotificationToast from '../components/DelayNotificationToast';
import { AlertTriangle, Navigation, X, Bell } from 'lucide-react';

/* ───── Sri-Lankan city → GPS coordinate lookup (mirrors backend) ───── */
const STOP_COORDS = {
  Colombo: { lat: 6.9271, lng: 79.8612 }, Kadawatha: { lat: 6.9941, lng: 79.9583 },
  Nittambuwa: { lat: 7.1431, lng: 80.0981 }, Kegalle: { lat: 7.2513, lng: 80.3464 },
  Peradeniya: { lat: 7.2673, lng: 80.6000 }, Kandy: { lat: 7.2906, lng: 80.6337 },
  Kottawa: { lat: 6.8476, lng: 79.9630 }, Gelanigama: { lat: 6.7750, lng: 80.0000 },
  Galle: { lat: 6.0535, lng: 80.2210 }, Matara: { lat: 5.9549, lng: 80.5550 },
  Kurunegala: { lat: 7.4868, lng: 80.3645 }, Anuradhapura: { lat: 8.3114, lng: 80.4037 },
  Vavuniya: { lat: 8.7514, lng: 80.4970 }, Kilinochchi: { lat: 9.3814, lng: 80.4119 },
  Jaffna: { lat: 9.6615, lng: 80.0255 }, Gampola: { lat: 7.1649, lng: 80.5696 },
  Pussellawa: { lat: 7.1066, lng: 80.6360 }, Ramboda: { lat: 7.0565, lng: 80.6880 },
  'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 }, Katugasthota: { lat: 7.3304, lng: 80.6329 },
  Wattegama: { lat: 7.3509, lng: 80.6537 }, Matale: { lat: 7.4712, lng: 80.6232 },
  Negombo: { lat: 7.2083, lng: 79.8358 }, Kochchikade: { lat: 7.2593, lng: 79.8528 },
  Wennappuwa: { lat: 7.3410, lng: 79.8465 }, Chilaw: { lat: 7.5758, lng: 79.7953 },
  Ratnapura: { lat: 6.7056, lng: 80.3847 }, Kuruwita: { lat: 6.8011, lng: 80.3679 },
  Avissawella: { lat: 6.9493, lng: 80.2174 }, Padaviya: { lat: 8.7883, lng: 80.6516 },
  Kanthale: { lat: 8.4044, lng: 81.0052 }, Trincomalee: { lat: 8.5874, lng: 81.2152 },
};

/* enrich array of stop names with coordinates */
function stopsWithCoords(names) {
  return (names || []).map(name => ({ name, ...(STOP_COORDS[name] || { lat: null, lng: null }) }));
}

export default function PassengerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [busLocations, setBusLocations] = useState({});       /* { scheduleId: { lat, lng } } */
  const [activeMapSchedule, setActiveMapSchedule] = useState(null);  /* scheduleId to show on map */
  const [proximityAlerts, setProximityAlerts] = useState([]); /* list of proximity alerts */

  /* fetch bookings */
  useEffect(() => {
    if (!user?.token) return;
    axios.get('/api/bookings/mybookings', {
      headers: { Authorization: `Bearer ${user.token}` }
    }).then(res => setBookings(res.data))
      .catch(err => console.error('Failed to load bookings', err));
  }, [user]);

  /* schedule IDs for room joining */
  const scheduleIds = useMemo(() => {
    const ids = bookings
      .filter(b => b.schedule_id && (b.status === 'Confirmed' || b.status === 'Pending'))
      .map(b => b.schedule_id);
    return [...new Set(ids)];
  }, [bookings]);

  /* confirmed bookings that have route data (eligible for map display) */
  const mapBookings = useMemo(() => {
    return bookings.filter(b => b.schedule_id && b.schedule?.route?.stops?.length && (b.status === 'Confirmed' || b.status === 'Pending'));
  }, [bookings]);

  /* which schedules have a live bus (conductor tracking) */
  const liveScheduleIds = useMemo(() => Object.keys(busLocations).map(Number), [busLocations]);

  /* pick the first booking's schedule to auto-show on map */
  useEffect(() => {
    if (!activeMapSchedule && mapBookings.length > 0) {
      setActiveMapSchedule(mapBookings[0].schedule_id);
    }
  }, [mapBookings, activeMapSchedule]);

  /* Socket.IO connection */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    if (user?.id) socket.emit('registerUser', user.id);

    /* join rooms once we have schedule IDs */
    if (scheduleIds.length > 0) {
      socket.emit('joinScheduleRooms', scheduleIds);
    }

    socket.on('connect', () => {
      if (user?.id) socket.emit('registerUser', user.id);
      if (scheduleIds.length > 0) socket.emit('joinScheduleRooms', scheduleIds);
    });

    /* real-time bus position */
    socket.on('busLocationUpdated', (data) => {
      setBusLocations(prev => ({ ...prev, [data.scheduleId]: { lat: data.lat, lng: data.lng } }));
    });

    /* proximity alert — your stop is near! */
    socket.on('proximityAlert', (data) => {
      setProximityAlerts(prev => {
        const exists = prev.find(a => a.scheduleId === data.scheduleId && a.stopName === data.stopName);
        if (exists) return prev;
        return [{ ...data, id: Date.now(), seen: false }, ...prev].slice(0, 10);
      });
      /* browser notification */
      if (Notification.permission === 'granted') {
        new Notification('Stop Approaching!', {
          body: data.message,
          icon: '/bus-icon.png'
        });
      }
      /* play alert chime */
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) { /* silent */ }
    });

    return () => socket.disconnect();
  }, [scheduleIds.join(',')]);

  const dismissAlert = (id) => setProximityAlerts(prev => prev.filter(a => a.id !== id));

  const handleViewBooking = (scheduleId) => {
    navigate(`/passenger/book/${scheduleId}`);
  };

  /* selected booking for map details */
  const activeBooking = useMemo(() => {
    if (!activeMapSchedule) return null;
    return bookings.find(b => b.schedule_id === activeMapSchedule);
  }, [bookings, activeMapSchedule]);

  /* build stops array with coords for the active booking's route */
  const routeStops = useMemo(() => {
    const s = activeBooking?.schedule?.route?.stops;
    return s ? stopsWithCoords(s) : [];
  }, [activeBooking]);

  const destinationStop = useMemo(() => {
    if (!activeBooking?.endStop) return null;
    const coord = STOP_COORDS[activeBooking.endStop];
    if (!coord) return null;
    return { name: activeBooking.endStop, ...coord };
  }, [activeBooking]);

  const currentBusLocation = activeMapSchedule ? busLocations[activeMapSchedule] : null;

  return (
    <>
      {/* proximity alert banners */}
      {proximityAlerts.length > 0 && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
          display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '90%', maxWidth: '520px'
        }}>
          {proximityAlerts.map(a => (
            <div key={a.id}
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '14px', padding: '1rem 1.25rem',
                boxShadow: '0 20px 60px rgba(239,68,68,0.4)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                animation: 'slideInDown 0.4s ease-out'
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Bell size={22} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 0.15rem 0', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                  Stop Approaching!
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                  {a.stopName} is only <strong>{a.distanceKm} km</strong> away — get ready to alight.
                </p>
              </div>
              <button onClick={() => dismissAlert(a.id)}
                style={{
                  background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.35rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <DelayNotificationToast
        user={user}
        scheduleIds={scheduleIds}
        onViewBooking={handleViewBooking}
      />

      <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* banner */}
        <div style={{ 
          position: 'relative', borderRadius: '16px', padding: '3rem 2rem', marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          overflow: 'hidden', minHeight: '200px'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'url(/passenger-banner.png)', backgroundSize: 'cover',
            backgroundPosition: 'center', zIndex: 0
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)',
            zIndex: 1
          }} />
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
            <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              Passenger Dashboard
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Manage your bookings, track your bus in real-time, and enjoy a premium travel experience.
            </p>
          </div>
        </div>

        {/* route map — visible for every booking */}
        {bookings.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Navigation size={18} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{currentBusLocation ? 'Live Bus Tracking' : 'Route Map'}</h3>
                {currentBusLocation ? (
                  <span className="inline-flex items-center gap-1 text-[0.65rem] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[0.65rem] text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Waiting for GPS
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {mapBookings.map(b => (
                  <button key={b.schedule_id} onClick={() => setActiveMapSchedule(b.schedule_id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 border ${
                      activeMapSchedule === b.schedule_id
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {b.schedule?.route?.name ? b.schedule.route.name.split(' to ')[1] || b.schedule.route.name : `Bus #${b.schedule_id}`}
                    {liveScheduleIds.includes(b.schedule_id) && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" />}
                  </button>
                ))}
              </div>
            </div>
            <LiveMap
              busLocation={currentBusLocation}
              stops={routeStops}
              destinationStop={destinationStop}
              startStop={activeBooking?.startStop || activeBooking?.schedule?.route?.stops?.[0]}
              endStop={activeBooking?.endStop}
              height="320px"
            />
            {activeBooking && !currentBusLocation && (
              <div className="mt-3 bg-slate-950/70 backdrop-blur-md border border-slate-800 p-4 text-center text-slate-400 font-medium tracking-wide flex items-center justify-center gap-2 animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-500" />
                Waiting for bus to start tracking...
              </div>
            )}
            {activeBooking && currentBusLocation && (
              <div className="mt-3 flex justify-between items-center text-xs text-slate-500">
                <span>{activeBooking.schedule?.route?.name} · {activeBooking.schedule?.bus?.busNumber}</span>
                <span>Your stop: <strong className="text-amber-400">{activeBooking.endStop}</strong></span>
              </div>
            )}
          </div>
        )}

        <Routes>
          <Route path="/" element={<MyBookings />} />
          <Route path="/book/:scheduleId" element={<BookSeat />} />
        </Routes>
      </div>

      {/* keyframe injection */}
      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
