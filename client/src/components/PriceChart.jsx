import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function PriceChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-[380px] sm:h-[420px] flex items-center justify-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 italic">
        No price history recorded yet. Trigger a scrape to record data points.
      </div>
    );
  }

  // Format history points for chart
  const data = history.map((item, idx) => ({
    index: idx + 1,
    time: new Date(item.scraped_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }),
    price: Number(item.price),
    stock: item.stock_status
  }));

  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  const yDomain = [
    Math.max(0, Math.floor(minPrice * 0.95)),
    Math.ceil(maxPrice * 1.05)
  ];

  return (
    <div className="w-full h-[360px] sm:h-[380px] md:h-[400px] p-4 rounded-xl bg-slate-950/80 border border-slate-800">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 25, left: 15, bottom: 20 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            domain={yDomain}
            tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              fontSize: '12px'
            }}
            formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Price']}
            labelFormatter={(label) => `Scraped: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#14b8a6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#priceGradient)"
            dot={{ fill: '#14b8a6', r: 4, strokeWidth: 1.5, stroke: '#042f2e' }}
            activeDot={{ r: 6, fill: '#2dd4bf' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
