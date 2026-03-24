import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CompetitorsData, type Competitor } from '@/lib/analyze';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

const THREAT_CONFIG = {
  high: { label: 'High', color: 'hsl(0 84% 60%)', bg: 'rgba(140,96,96,0.04)' },
  medium: { label: 'Medium', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.04)' },
  low: { label: 'Low', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.04)' },
};

function CompetitorCard({ comp }: { comp: Competitor }) {
  const [open, setOpen] = useState(false);
  const threat = THREAT_CONFIG[comp.threat_level];

  return (
    <div className="rounded-[12px] transition-all duration-200" style={{ backgroundColor: 'var(--surface-card)', border: `1px solid ${open ? 'var(--divider-section)' : 'var(--divider)'}` }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 flex items-start gap-4" style={{ cursor: 'pointer', border: 'none', background: 'none' }}>
        <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: threat.bg, border: `1px solid ${threat.color}20` }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 400, color: threat.color }}>
            {comp.rating ? comp.rating.toFixed(1) : '—'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{comp.name}</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: threat.bg, color: threat.color, border: `1px solid ${threat.color}20` }}>{threat.label} threat</span>
          </div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>{comp.location} · {comp.price_range}</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', display: 'inline-block' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(91,140,126,0.03)', border: '1px solid rgba(91,140,126,0.08)' }}>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 4 }}>Strength</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comp.key_strength}</p>
            </div>
            <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)' }}>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'hsl(0 84% 60%)', marginBottom: 4 }}>Gap</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comp.key_gap}</p>
            </div>
          </div>
          {comp.url && (
            <a href={comp.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              View website
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function Competitors({ context, onData, onError, shouldRun = true }: { context: AnalyzeContext; onData?: (data: CompetitorsData) => void; onError?: (error: string) => void; shouldRun?: boolean }) {
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('competitors', context)
      .then((result) => {
        if (!cancelled) { const d = result as CompetitorsData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Analyzing competitive landscape..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('competitors', context).then(r => { setData(r as CompetitorsData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const threatVal = { high: 3, medium: 2, low: 1 };
  const scatterData = data.competitors.map(c => ({ x: c.rating || 3, y: threatVal[c.threat_level], z: 200, name: c.name, threat: c.threat_level }));
  const scatterColors = { high: '#8C6B6B', medium: 'var(--accent-amber)', low: 'var(--accent-teal)' };

  return (
    <div>
      {/* Scatter */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Threat Matrix</p>
        <div className="rounded-[12px] p-4" style={{ height: 220, backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <XAxis type="number" dataKey="x" name="Rating" domain={[1, 5]} tickCount={5} style={{ fontSize: 10 }} label={{ value: 'Rating', position: 'insideBottom', offset: -5, style: { fontSize: 9, fill: 'var(--text-muted)' } }} />
              <YAxis type="number" dataKey="y" name="Threat" domain={[0, 4]} tickCount={4} tickFormatter={(v: number) => ['', 'Low', 'Med', 'High'][v] || ''} style={{ fontSize: 10 }} />
              <ZAxis type="number" dataKey="z" range={[80, 300]} />
              <Tooltip content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return <div className="rounded-[6px] px-3 py-1.5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>{d.name}</div>;
              }} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => <Cell key={i} fill={scatterColors[d.threat as keyof typeof scatterColors]} opacity={0.6} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 mb-8">
        {data.competitors.map((c, i) => <CompetitorCard key={i} comp={c} />)}
      </div>

      {/* Gaps */}
      {data.unfilled_gaps.length > 0 && (
        <div className="rounded-[12px] p-5" style={{ backgroundColor: 'rgba(45,139,117,0.02)', border: '1px solid rgba(91,140,126,0.08)' }}>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 12 }}>Unfilled Market Gaps</p>
          <div className="flex flex-col gap-3">
            {data.unfilled_gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3">
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--accent-teal)', marginTop: 6, flexShrink: 0 }} />
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
