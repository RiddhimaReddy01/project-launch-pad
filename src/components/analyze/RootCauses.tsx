import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type RootCauseData, type RootCause } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

const DIFF_CONFIG = {
  easy: { label: 'Easy', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.04)', border: 'rgba(45,139,117,0.1)' },
  medium: { label: 'Medium', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.04)', border: 'rgba(212,136,15,0.1)' },
  hard: { label: 'Hard', color: 'hsl(0 84% 60%)', bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.1)' },
};

function CauseCard({ cause }: { cause: RootCause }) {
  const [open, setOpen] = useState(false);
  const diff = DIFF_CONFIG[cause.difficulty];

  return (
    <div
      className="rounded-[12px] transition-all duration-200 cursor-pointer"
      style={{ backgroundColor: 'var(--surface-card)', border: `1px solid ${open ? 'var(--divider-section)' : 'var(--divider)'}` }}
      onClick={() => setOpen(!open)}
    >
      <div className="p-5 flex items-start gap-4">
        <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 28, height: 28, backgroundColor: 'rgba(26,26,26,0.04)', border: '1px solid var(--divider)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cause.cause_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{cause.title}</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 13, letterSpacing: '0.04em', backgroundColor: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>{diff.label}</span>
          </div>
          {!open && (
            <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginTop: 4 }}>
              {cause.explanation.slice(0, 100)}...
            </p>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', display: 'inline-block', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>

      {open && (
        <div className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />
          <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{cause.explanation}</p>

          <div className="rounded-[10px] p-4" style={{ backgroundColor: 'rgba(45,139,117,0.03)', borderLeft: '3px solid var(--accent-teal)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 6 }}>Your Counter-Strategy</p>
            <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.6 }}>{cause.your_move}</p>
          </div>

          {cause.difficulty === 'easy' && (
            <div className="mt-3 rounded-[8px] px-3 py-2" style={{ backgroundColor: 'rgba(45,139,117,0.04)', border: '1px solid rgba(45,139,117,0.08)' }}>
              <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--accent-teal)' }}>
                Quick win — your biggest early advantage
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RootCauses({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: RootCauseData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: RootCauseData | null }) {
  const [data, setData] = useState<RootCauseData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('rootcause', context)
      .then((result) => {
        if (!cancelled) { const d = result as RootCauseData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Analyzing why this gap exists..." section="rootcause" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('rootcause', context).then(r => { setData(r as RootCauseData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const diffOrder = ['easy', 'medium', 'hard'] as const;
  const grouped = diffOrder.map(d => ({
    label: DIFF_CONFIG[d].label,
    count: data.root_causes.filter(c => c.difficulty === d).length,
    color: DIFF_CONFIG[d].color,
    bg: DIFF_CONFIG[d].bg,
    border: DIFF_CONFIG[d].border,
  })).filter(g => g.count > 0);

  const total = data.root_causes.length;

  return (
    <div>
      {/* Difficulty spectrum */}
      <div className="card-base p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label" style={{ marginBottom: 0 }}>Difficulty Spectrum</p>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{total} friction points</span>
        </div>
        <div className="flex rounded-[6px] overflow-hidden" style={{ height: 24 }}>
          {grouped.map((g) => (
            <div
              key={g.label}
              style={{ width: `${(g.count / total) * 100}%`, backgroundColor: g.color, opacity: 0.75, transition: 'opacity 200ms' }}
              className="flex items-center justify-center cursor-default"
              title={`${g.label}: ${g.count}`}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.75'; }}
            >
              {g.count > 0 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{g.count}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          {grouped.map((g) => (
            <div key={g.label} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: g.color, opacity: 0.75 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {data.root_causes.map((cause, i) => <CauseCard key={i} cause={cause} />)}
      </div>
    </div>
  );
}
