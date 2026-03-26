import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CostsData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function StartupCostsPreview({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: CostsData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: CostsData | null }) {
  const [data, setData] = useState<CostsData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('costs', context)
      .then((result) => {
        if (!cancelled) { const d = result as CostsData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Estimating startup costs..." section="costs" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('costs', context).then(r => { setData(r as CostsData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const fmtDollar = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };

  const chartData = data.breakdown.map(b => ({ category: b.category, min: b.min, range: b.max - b.min }));
  const barOpacities = [0.5, 0.4, 0.35, 0.3, 0.25, 0.2];

  const sectionLabelStyle = {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
  };

  return (
    <div>
      {/* Total range */}
      <div className="rounded-[16px] p-6 mb-8" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ ...sectionLabelStyle, marginBottom: 12 }}>Estimated Startup Range</p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-heading" style={{ fontSize: 28 }}>{fmtDollar(data.total_range.min)}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>to</span>
          <span className="font-heading" style={{ fontSize: 28 }}>{fmtDollar(data.total_range.max)}</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
          Based on {context.city}, {context.state} market rates
        </p>
      </div>

      {/* Bar chart */}
      <div className="mb-8">
        <p style={{ ...sectionLabelStyle, marginBottom: 16 }}>Cost Breakdown</p>
        <div className="rounded-[16px] p-5" style={{ height: 320, backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" tickFormatter={fmtDollar} style={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={120} style={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number, name: string) => [fmtDollar(v), name === 'min' ? 'Minimum' : 'Range']} />
              <Bar dataKey="min" stackId="cost" radius={[0, 0, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill="var(--color-text-soft)" opacity={barOpacities[i % barOpacities.length]} />)}
              </Bar>
              <Bar dataKey="range" stackId="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill="var(--color-accent)" opacity={barOpacities[i % barOpacities.length] * 0.45} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-0 mb-8">
        {data.breakdown.map((cat, i) => (
          <div
            key={i}
            className="flex items-stretch overflow-hidden rounded-[10px] mb-2 last:mb-0"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              aria-hidden
              style={{
                width: 4,
                flexShrink: 0,
                backgroundColor: 'var(--color-accent)',
                opacity: barOpacities[i % barOpacities.length],
              }}
            />
            <div className="flex flex-1 items-center justify-between py-3.5 px-4 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{cat.category}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                {fmtDollar(cat.min)} – {fmtDollar(cat.max)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cost driver note */}
      <div
        className="rounded-[16px] p-5"
        style={{
          backgroundColor: 'hsl(38 92% 50% / 0.09)',
          border: '1px solid hsl(38 70% 42% / 0.28)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <p style={{ ...sectionLabelStyle, color: 'var(--accent-amber)', marginBottom: 10 }}>Biggest Cost Driver</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{data.note}</p>
      </div>
    </div>
  );
}
