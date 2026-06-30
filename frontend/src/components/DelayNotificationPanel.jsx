import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X, Bus, ExternalLink } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

export default function DelayNotificationPanel({ user, scheduleIds, onViewBooking }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useState(() => {
    if (!scheduleIds || scheduleIds.length === 0) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('joinScheduleRooms', scheduleIds);
    socket.on('delayNotification', (data) => {
      if (data.isActive) {
        setNotifications(prev => {
          const exists = prev.find(n => n.scheduleId === data.scheduleId);
          if (exists) return prev.map(n => n.scheduleId === data.scheduleId ? { ...data, id: n.id } : n);
          return [{ ...data, id: Date.now(), read: false }, ...prev];
        });
      }
    });
    socket.on('connect', () => socket.emit('joinScheduleRooms', scheduleIds));
    return () => socket.disconnect();
  }, [scheduleIds]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => setNotifications([]);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{
          background: unreadCount > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
          border: unreadCount > 0 ? '1px solid rgba(251,191,36,0.3)' : 'none',
          borderRadius: '10px', padding: '0.6rem', cursor: 'pointer',
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}
      >
        <Clock size={20} style={{ color: unreadCount > 0 ? '#fbbf24' : 'var(--text-primary)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#f59e0b', color: 'white',
            fontSize: '0.6rem', fontWeight: 700,
            minWidth: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', padding: '0 4px',
            boxShadow: '0 2px 8px rgba(245,158,11,0.5)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
              width: '400px', maxHeight: '480px',
              background: 'rgba(15,23,42,0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              zIndex: 99999, overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Delay Alerts ({notifications.length})
              </span>
              {notifications.length > 0 && (
                <button onClick={clearAll}
                  style={{
                    background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px',
                    color: '#f87171', cursor: 'pointer', fontSize: '0.75rem',
                    padding: '0.3rem 0.7rem', fontWeight: 600
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Clock size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0 }}>No delay alerts</p>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: n.read ? 'transparent' : 'rgba(251,191,36,0.05)',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: n.read ? '#334155' : '#fbbf24', flexShrink: 0, marginTop: '6px'
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24' }}>
                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Bus {n.busNumber} — {n.routeName}
                      </p>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {n.delayMinutes} min delay{n.reason ? ` — ${n.reason}` : ''}
                      </p>
                      <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.4rem 0.6rem',
                        display: 'flex', gap: '1rem', fontSize: '0.72rem'
                      }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Original: </span>
                          <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{n.originalDepartureTime}</span>
                        </div>
                        <div>
                          <span style={{ color: '#4ade80' }}>New: </span>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>{n.newDepartureTime}</span>
                        </div>
                      </div>
                      {n.updatedAt && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.65rem', color: '#475569' }}>
                          Updated: {new Date(n.updatedAt).toLocaleTimeString()}
                        </p>
                      )}
                      {onViewBooking && (
                        <button onClick={(e) => { e.stopPropagation(); onViewBooking(n.scheduleId); }}
                          style={{
                            marginTop: '0.4rem', background: 'rgba(59,130,246,0.1)', border: 'none',
                            borderRadius: '6px', color: '#60a5fa', fontSize: '0.7rem',
                            padding: '0.2rem 0.6rem', cursor: 'pointer', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                          }}
                        >
                          <ExternalLink size={10} /> View Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
