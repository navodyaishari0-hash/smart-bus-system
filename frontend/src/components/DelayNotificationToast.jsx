import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X, Bus, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

export default function DelayNotificationToast({ user, scheduleIds, onViewBooking }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!scheduleIds || scheduleIds.length === 0) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('joinScheduleRooms', scheduleIds);
    socket.on('delayNotification', (data) => {
      if (data.isActive) {
        setNotifications(prev => [{ ...data, id: Date.now(), seen: false }, ...prev].slice(0, 5));
        if (Notification.permission === 'granted') {
          new Notification(`Bus ${data.busNumber} Delayed`, {
            body: `${data.routeName} — ${data.delayMinutes} min delay. New departure: ${data.newDepartureTime}`,
            icon: '/bus-icon.png'
          });
        }
      }
    });
    socket.on('connect', () => socket.emit('joinScheduleRooms', scheduleIds));
    return () => socket.disconnect();
  }, [scheduleIds]);

  const dismiss = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px'
    }}>
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              background: 'rgba(15,23,42,0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '14px',
              padding: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(251,191,36,0.1)',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={20} style={{ color: '#fbbf24' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>
                Bus Delay Alert
              </p>
              <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.78rem', color: '#e2e8f0' }}>
                {n.routeName} · Bus {n.busNumber}
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ color: '#94a3b8' }}>Original</span>
                  <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{n.originalDepartureTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ color: '#4ade80' }}>New Departure</span>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>{n.newDepartureTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: '#fbbf24' }}>
                  <span>Delay</span>
                  <span>{n.delayMinutes} min{n.reason ? ` — ${n.reason}` : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {onViewBooking && (
                  <button onClick={() => { onViewBooking(n.scheduleId); dismiss(n.id); }}
                    style={{
                      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                      color: '#60a5fa', borderRadius: '8px', padding: '0.3rem 0.75rem',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flex: 1
                    }}
                  >
                    View Booking
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => dismiss(n.id)}
              style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem',
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px',
                color: '#64748b', cursor: 'pointer', padding: '0.2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
