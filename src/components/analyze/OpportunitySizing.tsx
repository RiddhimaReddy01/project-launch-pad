import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type OpportunityData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

const CONFIDENCE_CONFIG = {
  low: { color: 'hsl(0 84% 60%)', label: 'Low confidence' },
  medium: { color: 'var(--accent-amber)', label: 'Medium confidence' },
  high: { color: 'var(--accent-teal)', label: 'High confidence' },
};

export default function OpportunitySizing({ context, onData }: { context: AnalyzeContext; onData?: (data: OpportunityData) => void }) {
  const [data, setData] = useState<OpportunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('opportunity', context)
      .then((result) => {
        if (!cancelled) { const d = result as OpportunityData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SectionSkeleton label="Calculating TAM / SAM / SOM..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('opportunity', context).then(r => { setData(r as OpportunityData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const tiers = [
    { key: 'TAM', label: 'Total Addressable Market', ...data.tam },
    { key: 'SAM', label: 'Serviceable Available Market', ...data.sam },
    { key: 'SOM', label: 'Serviceable Obtainable Market', ...data.som },
  ];

  const chartData = tiers.map(t => ({ name: t.key, value: t.value }));
  const barColors = ['var(--text-primary)', 'var(--text-secondary)', 'var(--accent-teal)'];

  const funnelData = [
    { name: 'Population', value: data.funnel.population },
    { name: 'Aware', value: data.funnel.aware },
    { name: 'Interested', value: data.funnel.interested },
    { name: 'Willing to Try', value: data.funnel.willing_to_try },
    { name: 'Repeat', value: data.funnel.repeat_customers },
  ];

  const fmt = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };

  const fmtNum = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toString();
  };

  return (
    <div>
      {/* Tier cards */}
      <div className="flex flex-col gap-4 mb-10">
        {tiers.map((t, idx) => {
          const conf = CONFIDENCE_CONFIG[t.confidence];
          return (
            <div key={t.key} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.key}</span>
                <span style={{ width: 1, height: 10, backgroundColor: 'var(--divider-section)' }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '0.04em', color: conf.color }}>{conf.label}</span>
              </div>
              <p className="font-heading" style={{ fontSize: 28, letterSpacing: '-0.02em', marginBottom: 4 }}>{t.formatted}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t.label}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>{t.methodology}</p>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="mb-10">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Market Size Comparison</p>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tickFormatter={fmt} style={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={40} style={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={barColors[i]} opacity={0.65} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer funnel */}
      <div className="mb-10">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Customer Funnel</p>
        <div className="flex flex-col items-center gap-1.5">
          {funnelData.map((step, i) => {
            const widthPct = Math.max(((funnelData.length - i) / funnelData.length) * 100, 20);
            const opacity = 0.06 + (i * 0.03);
            return (
              <div key={step.name} className="flex items-center gap-3" style={{ width: '100%' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)', width: 80, textAlign: 'right', flexShrink: 0, letterSpacing: '0.02em' }}>{step.name}</span>
                <div style={{ flex: 1 }}>
                  <div className="rounded-[4px]" style={{ width: `${widthPct}%`, height: 24, backgroundColor: `rgba(26,26,26,${opacity})`, display: 'flex', alignItems: 'center', paddingLeft: 10, transition: 'width 600ms ease-out' }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmtNum(step.value)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology toggle */}
      <button onClick={() => setMethodOpen(!methodOpen)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        {methodOpen ? 'Hide methodology' : 'How we estimated this'}
      </button>
      {methodOpen && (
        <div className="rounded-[10px] mt-3 p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          {tiers.map(t => (
            <p key={t.key} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>{t.key}:</span> {t.methodology}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
