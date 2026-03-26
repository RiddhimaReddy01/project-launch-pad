import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type MoatData } from '@/lib/analyze';
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

  const sortedDimensions = [...data.dimensions].sort((a, b) => b.score - a.score);
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

      {/* Ranked dimensions */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Defensibility Dimensions</p>
        <div className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <div className="flex flex-col gap-4">
            {sortedDimensions.map((dim, i) => {
              const barPct = (dim.score / 10) * 100;
              const dimColor = dim.score >= 7 ? 'var(--accent-teal)' : dim.score >= 4 ? 'var(--accent-amber)' : 'hsl(0 84% 60%)';
              return (
                <div key={i} title={dim.rationale}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{dim.dimension}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: dimColor }}>{dim.score}/10</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, backgroundColor: 'var(--surface-elevated)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: dimColor, borderRadius: 999, transition: 'width 600ms ease-out' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{dim.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strongest & weakest */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'rgba(45,139,117,0.03)', border: '1px solid rgba(45,139,117,0.1)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 6 }}>Strongest</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{data.strongest}</p>
        </div>
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'hsl(0 84% 60%)', marginBottom: 6 }}>Weakest</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{data.weakest}</p>
        </div>
      </div>
    </div>
  );
}
