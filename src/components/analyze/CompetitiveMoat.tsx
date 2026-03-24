import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type MoatData } from '@/lib/analyze';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function CompetitiveMoat({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: MoatData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: MoatData | null }) {
  const [data, setData] = useState<MoatData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('moat', context)
      .then((result) => {
        if (!cancelled) { const d = result as MoatData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Evaluating competitive defensibility..." section="moat" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('moat', context).then(r => { setData(r as MoatData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const radarData = data.dimensions.map(d => ({ dimension: d.dimension, score: d.score }));
  const scoreColor = data.overall_score >= 7 ? 'var(--accent-teal)' : data.overall_score >= 4 ? 'var(--accent-amber)' : 'hsl(0 84% 60%)';

  return (
    <div>
      {/* Overall moat score */}
      <div className="rounded-[12px] p-6 mb-8 flex items-center gap-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 400, color: scoreColor }}>{data.overall_score}</span>
        </div>
        <div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: scoreColor, marginBottom: 4 }}>Moat Score /10</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.recommendation}</p>
        </div>
      </div>

      {/* Radar chart */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Defensibility Dimensions</p>
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--divider-light)" />
                <PolarAngleAxis dataKey="dimension" style={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Radar dataKey="score" stroke="var(--text-primary)" fill="var(--text-primary)" fillOpacity={0.08} strokeWidth={1.5} dot={{ r: 3, fill: 'var(--text-primary)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strongest & weakest */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'rgba(45,139,117,0.03)', border: '1px solid rgba(45,139,117,0.1)' }}>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 4 }}>Strongest</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{data.strongest}</p>
        </div>
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'hsl(0 84% 60%)', marginBottom: 4 }}>Weakest</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{data.weakest}</p>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="flex flex-col gap-2">
        {data.dimensions.map((dim, i) => {
          const barPct = (dim.score / 10) * 100;
          const dimColor = dim.score >= 7 ? 'var(--accent-teal)' : dim.score >= 4 ? 'var(--accent-amber)' : 'hsl(0 84% 60%)';
          return (
            <div key={i} className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{dim.dimension}</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: dimColor }}>{dim.score}/10</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: dimColor, borderRadius: 2, transition: 'width 600ms ease-out' }} />
              </div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.5 }}>{dim.rationale}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
