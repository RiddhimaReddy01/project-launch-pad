import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type RootCauseData, type RootCause } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

const DIFF_CONFIG = {
  easy: { label: '🟢 Easy', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.06)' },
  medium: { label: '🟡 Medium', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.06)' },
  hard: { label: '🔴 Hard', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
};

function CauseCard({ cause }: { cause: RootCause }) {
  const [open, setOpen] = useState(false);
  const diff = DIFF_CONFIG[cause.difficulty];

  return (
    <div
      className="rounded-[12px] transition-all duration-200 cursor-pointer"
      style={{ backgroundColor: 'var(--surface-card)', boxShadow: open ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)' }}
      onClick={() => setOpen(!open)}
    >
      <div className="p-5 flex items-start gap-4">
        <div className="flex-shrink-0 flex items-center justify-center rounded-[8px]" style={{ width: 32, height: 32, backgroundColor: 'rgba(212,136,15,0.08)' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--accent-amber)' }}>{cause.cause_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)' }}>{cause.title}</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, backgroundColor: diff.bg, color: diff.color }}>{diff.label}</span>
          </div>
          {!open && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginTop: 4 }}>
              {cause.explanation.slice(0, 100)}...
            </p>
          )}
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', display: 'inline-block', flexShrink: 0 }}>↓</span>
      </div>

      {open && (
        <div className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{cause.explanation}</p>

          <div className="rounded-[10px] p-4" style={{ backgroundColor: 'rgba(45,139,117,0.04)', borderLeft: '3px solid var(--accent-teal)' }}>
            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--accent-teal)', marginBottom: 6 }}>YOUR COUNTER-STRATEGY</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.6 }}>{cause.your_move}</p>
          </div>

          {cause.difficulty === 'easy' && (
            <div className="mt-3 rounded-[8px] px-3 py-2" style={{ backgroundColor: 'rgba(45,139,117,0.06)' }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--accent-teal)' }}>
                ⚡ This is a quick win — your biggest early advantage
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RootCauses({ context, onData }: { context: AnalyzeContext; onData?: (data: RootCauseData) => void }) {
  const [data, setData] = useState<RootCauseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyzeSection('rootcause', context)
      .then((result) => {
        if (!cancelled) {
          const d = result as RootCauseData;
          setData(d);
          onData?.(d);
          setLoading(false);
        }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SectionSkeleton label="Analyzing why this gap exists..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'var(--destructive)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('rootcause', context).then(r => { setData(r as RootCauseData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  // Difficulty timeline
  const diffOrder = ['easy', 'medium', 'hard'];
  const grouped = diffOrder.map(d => ({
    label: DIFF_CONFIG[d as keyof typeof DIFF_CONFIG].label,
    count: data.root_causes.filter(c => c.difficulty === d).length,
    color: DIFF_CONFIG[d as keyof typeof DIFF_CONFIG].color,
  })).filter(g => g.count > 0);

  return (
    <div>
      {/* Difficulty overview */}
      <div className="flex gap-4 mb-8">
        {grouped.map((g, i) => (
          <div key={i} className="rounded-[10px] px-4 py-3 flex-1" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: g.color }}>{g.count}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>{g.label}</p>
          </div>
        ))}
      </div>

      {/* Cause cards */}
      <div className="flex flex-col gap-3">
        {data.root_causes.map((cause, i) => <CauseCard key={i} cause={cause} />)}
      </div>
    </div>
  );
}
