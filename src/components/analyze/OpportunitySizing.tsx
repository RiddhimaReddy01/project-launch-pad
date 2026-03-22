import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type OpportunityData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

const CONFIDENCE_ICON = { low: '⚠️', medium: 'ℹ️', high: '✅' };
const CONFIDENCE_COLOR = { low: '#EF4444', medium: 'var(--accent-amber)', high: 'var(--accent-teal)' };

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
        if (!cancelled) {
          const d = result as OpportunityData;
          setData(d);
          onData?.(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SectionSkeleton label="Calculating TAM / SAM / SOM..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'var(--destructive)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('opportunity', context).then(r => { setData(r as OpportunityData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const tiers = [
    { key: 'TAM', label: 'Total Addressable Market', ...data.tam },
    { key: 'SAM', label: 'Serviceable Available Market', ...data.sam },
    { key: 'SOM', label: 'Serviceable Obtainable Market', ...data.som },
  ];

  const chartData = tiers.map(t => ({ name: t.key, value: t.value }));
  const barColors = ['var(--accent-purple)', 'var(--accent-blue)', 'var(--accent-teal)'];

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
      <div className="flex flex-col gap-6 mb-10">
        {tiers.map((t) => (
          <div key={t.key} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em' }}>{t.key} — {t.label}</span>
              <span style={{ fontSize: 14 }}>{CONFIDENCE_ICON[t.confidence]}</span>
              <span style={{ fontSize: 11, color: CONFIDENCE_COLOR[t.confidence], fontFamily: "'Inter', sans-serif" }}>{t.confidence}</span>
            </div>
            <p className="font-heading" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>{t.formatted}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{t.methodology}</p>
          </div>
        ))}
      </div>

      {/* TAM/SAM/SOM bar chart */}
      <div className="mb-10">
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 16 }}>MARKET SIZE COMPARISON</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tickFormatter={fmt} style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={40} style={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={barColors[i]} opacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer funnel */}
      <div className="mb-10">
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 16 }}>CUSTOMER FUNNEL</p>
        <div className="flex flex-col items-center gap-2">
          {funnelData.map((step, i) => {
            const widthPct = Math.max(((funnelData.length - i) / funnelData.length) * 100, 20);
            return (
              <div key={step.name} className="flex items-center gap-3" style={{ width: '100%' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)', width: 90, textAlign: 'right', flexShrink: 0 }}>{step.name}</span>
                <div style={{ flex: 1 }}>
                  <div className="rounded-[6px]" style={{ width: `${widthPct}%`, height: 28, backgroundColor: `rgba(108,92,231,${0.08 + i * 0.04})`, display: 'flex', alignItems: 'center', paddingLeft: 10, transition: 'width 600ms ease-out' }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--accent-purple)', whiteSpace: 'nowrap' }}>{fmtNum(step.value)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology */}
      <button onClick={() => setMethodOpen(!methodOpen)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        {methodOpen ? 'Hide methodology ↑' : 'How we estimated this ↓'}
      </button>
      {methodOpen && (
        <div className="rounded-[10px] mt-3 p-4" style={{ backgroundColor: 'var(--surface-input)' }}>
          {tiers.map(t => (
            <p key={t.key} className="font-caption" style={{ fontSize: 12, marginBottom: 8 }}>
              <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>{t.key}:</span> {t.methodology}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
