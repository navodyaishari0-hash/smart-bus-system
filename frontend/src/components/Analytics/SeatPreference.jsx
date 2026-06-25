import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = {
    Window: '#3b82f6',
    Aisle: '#8b5cf6',
    Unknown: '#6b7280',
    Front: '#10b981',
    Middle: '#f59e0b',
    Back: '#ef4444'
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!percent) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="rgba(255,255,255,0.7)" textAnchor="middle" dominantBaseline="central" fontSize={11}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem'
        }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{d.name}</p>
            <p style={{ margin: '0.25rem 0 0 0', color: d.fill }}>Count: <strong>{d.value}</strong></p>
            {d.percent !== undefined && (
                <p style={{ margin: 0, color: '#94a3b8' }}>Share: <strong>{d.percent}%</strong></p>
            )}
        </div>
    );
};

export default function SeatPreference({ position, zone, seatRanking }) {
    const hasData = seatRanking?.length > 0;

    if (!hasData) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Seat Preference Analytics</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No seat booking data yet.
                </p>
            </div>
        );
    }

    const positionPie = position?.labels
        ?.filter(name => name !== 'Unknown')
        ?.map((name, i) => {
            const idx = position.labels.indexOf(name);
            return {
                name,
                value: position.values[idx],
                fill: COLORS[name] || '#6b7280',
                percent: position.percent[name]
            };
        }) || [];

    const zonePie = zone?.labels
        ?.filter(name => name !== 'Unknown')
        ?.map((name, i) => {
            const idx = zone.labels.indexOf(name);
            return {
                name,
                value: zone.values[idx],
                fill: COLORS[name] || '#6b7280',
                percent: zone.percent[name]
            };
        }) || [];

    const rankingData = (seatRanking || []).slice(0, 12).reverse();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>Seat Preference Analytics</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Analyze which seat types and positions passengers book most frequently.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#93c5fd', textAlign: 'center' }}>
                        Window vs Aisle
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={positionPie}
                                cx="50%" cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                label={renderCustomLabel}
                                labelLine={false}
                                animationDuration={800}
                            >
                                {positionPie.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                formatter={(value) => (
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#c4b5fd', textAlign: 'center' }}>
                        Front vs Middle vs Back
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={zonePie}
                                cx="50%" cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                label={renderCustomLabel}
                                labelLine={false}
                                animationDuration={800}
                            >
                                {zonePie.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                formatter={(value) => (
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#fbbf24' }}>Top Booked Seat Numbers</h4>
                <ResponsiveContainer width="100%" height={Math.max(200, rankingData.length * 28)}>
                    <BarChart
                        data={rankingData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="seatNumber"
                            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                            tickLine={false}
                            width={40}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div style={{
                                        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem'
                                    }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{d.seatNumber}</p>
                                        <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8' }}>
                                            {d.position} &middot; {d.zone} &middot; <strong>{d.count}</strong> bookings
                                        </p>
                                    </div>
                                );
                            }}
                        />
                        <Bar
                            dataKey="count"
                            name="Bookings"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                            animationDuration={800}
                            label={{
                                position: 'right',
                                fill: 'rgba(255,255,255,0.5)',
                                fontSize: 11,
                                formatter: v => v
                            }}
                        />
                    </BarChart>
                </ResponsiveContainer>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Seat numbering: 4 per row (positions 1&amp;4 = Window, 2&amp;3 = Aisle)
                </p>
            </div>
        </div>
    );
}
