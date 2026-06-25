import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

const chartColors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#10b981',
    warning: '#f59e0b',
    grid: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.7)'
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem'
        }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '0.25rem 0 0 0', color: p.color }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

export default function BusiestTimes({ hourly, weekly, routePopularity }) {
    const hasData = hourly?.some(h => h.count > 0) || weekly?.some(w => w.count > 0);

    if (!hasData) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Booking Trends</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No booking data yet.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>Booking Trends &amp; Peak Times</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Aggregated booking volumes help identify rush hours and busy days.
                </p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#93c5fd' }}>Bookings by Hour of Day</h4>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={hourly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: chartColors.text, fontSize: 11 }}
                            tickLine={false}
                            interval={2}
                        />
                        <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            name="Bookings"
                            stroke={chartColors.primary}
                            strokeWidth={2}
                            fill="url(#hourlyGrad)"
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Peak hour: {hourly?.reduce((a, b) => a.count > b.count ? a : b)?.label || 'N/A'}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#c4b5fd' }}>Bookings by Day of Week</h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={weekly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="day"
                                tick={{ fill: chartColors.text, fontSize: 11 }}
                                tickLine={false}
                            />
                            <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="count"
                                name="Bookings"
                                fill={chartColors.secondary}
                                radius={[4, 4, 0, 0]}
                                animationDuration={800}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#fbbf24' }}>Route Popularity</h4>
                    {routePopularity?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {routePopularity.slice(0, 7).map((r, i) => {
                                const maxCount = routePopularity[0]?.count || 1;
                                const pct = Math.round((r.count / maxCount) * 100);
                                const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
                                return (
                                    <div key={r.routeId || i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                            <span style={{ color: 'var(--text-primary)' }}>
                                                {i + 1}. {r.routeName || `Route #${r.routeId}`}
                                            </span>
                                            <span style={{ color: colors[i], fontWeight: 600 }}>{r.count}</span>
                                        </div>
                                        <div style={{
                                            width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)',
                                            borderRadius: '3px', overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${pct}%`, height: '100%',
                                                background: colors[i],
                                                borderRadius: '3px',
                                                transition: 'width 0.8s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                            No route data available.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
