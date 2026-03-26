import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type OpportunityData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

const CONFIDENCE_CONFIG = {
  low: { color: 'hsl(var(--destructive))', label: 'Low confidence' },
  medium: { color: 'var(--accent-amber)', label: 'Medium confidence' },
  high: { color: 'var(--accent-teal)', label: 'High confidence' },
};

export default function OpportunitySizing({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: OpportunityData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: OpportunityData | null }) {
  const [data, setData] = useState<OpportunityData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('opportunity', context)
      .then((result) => {
        if (!cancelled) { const d = result as OpportunityData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Calculating TAM / SAM / SOM..." section="opportunity" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(var(--destructive))', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('opportunity', context).then(r => { setData(r as OpportunityData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="btn-primary rounded-[10px] px-4 py-2">Retry</button>
    </div>
  );
  if (!data) return null;

  const tiers = [
    { key: 'TAM', label: 'Total Addressable Market', ...data.tam },
    { key: 'SAM', label: 'Serviceable Available Market', ...data.sam },
    { key: 'SOM', label: 'Serviceable Obtainable Market', ...data.som },
  ];

  const chartData = tiers.map(t => ({ name: t.key, value: t.value }));
  const barColors = ['var(--text-primary)', 'var(--accent-blue)', 'var(--accent-primary)'];

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
      <div className="card-base p-6 mb-10" style={{
        border: '1px solid var(--divider)',
        backgroundColor: 'var(--surface-card)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <p className="section-label mb-2" style={{ color: 'var(--accent-primary)' }}>Customer Funnel</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Conversion path from broad reach to repeat customers
            </p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--divider)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
              Repeat customer base
            </p>
            <p className="font-heading" style={{ fontSize: 24, letterSpacing: '-0.03em' }}>{fmtNum(data.funnel.repeat_customers)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {funnelData.map((step, i) => {
            const colors = ['var(--text-primary)', 'var(--text-secondary)', 'var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-primary)'];
            const widthPct = Math.max((step.value / Math.max(funnelData[0].value, 1)) * 100, 18);
            const priorValue = i === 0 ? funnelData[0].value : funnelData[i - 1].value;
            const conversion = priorValue > 0 ? Math.round((step.value / priorValue) * 100) : 100;
            return (
              <div key={step.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{step.name}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{fmtNum(step.value)}</span>
                    {i > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: colors[i], letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {conversion}% retained
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 14, backgroundColor: 'var(--surface-subtle)' }}>
                  <div style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: colors[i],
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-4 mb-10">
        {tiers.map((t) => {
          const conf = CONFIDENCE_CONFIG[t.confidence];
          return (
            <div key={t.key} className="card-base p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="section-label">{t.key}</span>
                <span style={{ width: 1, height: 10, backgroundColor: 'var(--divider-section)' }} />
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, letterSpacing: '0.04em', color: conf.color }}>{conf.label}</span>
              </div>
              <p className="font-heading" style={{ fontSize: 28, letterSpacing: '-0.02em', marginBottom: 4 }}>{t.formatted}</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t.label}</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>{t.methodology}</p>
            </div>
          );
        })}
      </div>


      {/* Customer funnel — visual pyramid */}
      {/* Methodology toggle */}
      <button onClick={() => setMethodOpen(!methodOpen)} title="See how the market size estimates were calculated" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        {methodOpen ? 'Hide methodology' : 'How we estimated this'}
      </button>
      {methodOpen && (
        <div className="card-base mt-3 p-4">
          {tiers.map(t => (
            <p key={t.key} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>{t.key}:</span> {t.methodology}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
