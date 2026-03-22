import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CostsData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function StartupCostsPreview({ context, onData }: { context: AnalyzeContext; onData?: (data: CostsData) => void }) {
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyzeSection('costs', context)
      .then((result) => {
        if (!cancelled) {
          const d = result as CostsData;
          setData(d);
          onData?.(d);
          setLoading(false);
        }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SectionSkeleton label="Estimating startup costs..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'var(--destructive)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('costs', context).then(r => { setData(r as CostsData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const fmtDollar = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };

  const chartData = data.breakdown.map(b => ({
    category: b.category,
    min: b.min,
    range: b.max - b.min,
  }));

  const colors = ['rgba(108,92,231,0.6)', 'rgba(59,130,246,0.6)', 'rgba(45,139,117,0.6)', 'rgba(212,136,15,0.6)', 'rgba(239,68,68,0.6)', 'rgba(156,163,175,0.6)'];

  return (
    <div>
      {/* Total range banner */}
      <div className="rounded-[14px] p-6 mb-8" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 12 }}>ESTIMATED STARTUP RANGE</p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-heading" style={{ fontSize: 28 }}>{fmtDollar(data.total_range.min)}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>to</span>
          <span className="font-heading" style={{ fontSize: 28 }}>{fmtDollar(data.total_range.max)}</span>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>
          Based on {context.city}, {context.state} market rates
        </p>
      </div>

      {/* Stacked bar chart */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 16 }}>COST BREAKDOWN</p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" tickFormatter={fmtDollar} style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" width={120} style={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [fmtDollar(v), name === 'min' ? 'Minimum' : 'Range']} />
              <Bar dataKey="min" stackId="cost" radius={[0, 0, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
              <Bar dataKey="range" stackId="cost" radius={[0, 4, 4, 0]} fillOpacity={0.4}>
                {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-1 mb-8">
        {data.breakdown.map((cat, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-3 rounded-[8px]" style={{ borderBottom: '1px solid var(--divider)' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)' }}>{cat.category}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
              {fmtDollar(cat.min)} – {fmtDollar(cat.max)}
            </p>
          </div>
        ))}
      </div>

      {/* Cost driver note */}
      <div className="rounded-[10px] p-4" style={{ backgroundColor: 'rgba(212,136,15,0.04)', borderLeft: '3px solid var(--accent-amber)' }}>
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--accent-amber)', marginBottom: 4 }}>BIGGEST COST DRIVER</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{data.note}</p>
      </div>
    </div>
  );
}
