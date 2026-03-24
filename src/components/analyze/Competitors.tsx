import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CompetitorsData, type Competitor } from '@/lib/analyze';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

const THREAT_CONFIG = {
  high: { label: 'High', color: 'hsl(var(--destructive))', bg: 'rgba(140,96,96,0.04)' },
  medium: { label: 'Medium', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.04)' },
  low: { label: 'Low', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.04)' },
};

function CompetitorCard({ comp, index }: { comp: Competitor; index: number }) {
  const [open, setOpen] = useState(false);
  const threat = THREAT_CONFIG[comp.threat_level];

  return (
    <div className="card-base transition-all duration-200" style={{ border: `1px solid ${open ? 'var(--divider-section)' : 'var(--divider)'}` }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 flex items-start gap-4" style={{ cursor: 'pointer', border: 'none', background: 'none' }}>
        <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: threat.bg, border: `1px solid ${threat.color}20` }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 400, color: threat.color }}>
            {comp.rating ? comp.rating.toFixed(1) : '--'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{comp.name}</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: threat.bg, color: threat.color, border: `1px solid ${threat.color}20` }}>{threat.label} threat</span>
          </div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>{comp.location} / {comp.price_range}</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', display: 'inline-block' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 animate-fade-in">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(91,140,126,0.03)', border: '1px solid rgba(91,140,126,0.08)' }}>
              <p className="section-label" style={{ color: 'var(--accent-teal)', marginBottom: 4 }}>Strength</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comp.key_strength}</p>
            </div>
            <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(196,69,62,0.03)', border: '1px solid rgba(196,69,62,0.08)' }}>
              <p className="section-label" style={{ color: 'hsl(var(--destructive))', marginBottom: 4 }}>Gap</p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comp.key_gap}</p>
            </div>
          </div>
          {comp.url && (
            <a href={comp.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
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

  if (loading) return <SectionSkeleton label="Analyzing competitive landscape..." section="competitors" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(var(--destructive))', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('competitors', context).then(r => { setData(r as CompetitorsData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="btn-primary rounded-[10px] px-4 py-2">Retry</button>
    </div>
  );
  if (!data) return null;

  const threatVal = { high: 3, medium: 2, low: 1 };
  const scatterData = data.competitors.map(c => ({ x: c.rating || 3, y: threatVal[c.threat_level], z: 200, name: c.name, threat: c.threat_level }));
  const scatterColors = { high: 'hsl(4, 55%, 51%)', medium: '#B8860B', low: '#5B8C7E' };

  return (
    <div>
      {/* Scatter — Threat Matrix */}
      <div className="mb-8">
        <p className="section-label mb-4">Threat Matrix</p>
        <div className="card-base p-4" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <XAxis type="number" dataKey="x" name="Rating" domain={[1, 5]} tickCount={5} style={{ fontSize: 10 }} label={{ value: 'Rating', position: 'insideBottom', offset: -5, style: { fontSize: 9, fill: 'var(--text-muted)' } }} />
              <YAxis type="number" dataKey="y" name="Threat" domain={[0, 4]} tickCount={4} tickFormatter={(v: number) => ['', 'Low', 'Med', 'High'][v] || ''} style={{ fontSize: 10 }} />
              <ZAxis type="number" dataKey="z" range={[80, 300]} />
              <Tooltip content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return <div className="card-base px-3 py-1.5" style={{ fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>{d.name}</div>;
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
        {data.competitors.map((c, i) => <CompetitorCard key={i} comp={c} index={i} />)}
      </div>

      {/* Gaps */}
      {data.unfilled_gaps.length > 0 && (
        <div className="rounded-[12px] p-5" style={{ backgroundColor: 'rgba(45,139,117,0.02)', border: '1px solid rgba(91,140,126,0.08)' }}>
          <p className="section-label" style={{ color: 'var(--accent-teal)', marginBottom: 12 }}>Unfilled Market Gaps</p>
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
