import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type RiskData } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

const LEVEL_CONFIG = {
  low: { color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.12)', label: 'Low' },
  medium: { color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.12)', label: 'Medium' },
  high: { color: 'hsl(0 84% 60%)', bg: 'rgba(239,68,68,0.12)', label: 'High' },
};

const likelihoodVal = { low: 1, medium: 2, high: 3 };
const impactVal = { low: 1, medium: 2, high: 3 };

export default function RiskMatrix({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: RiskData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: RiskData | null }) {
  const [data, setData] = useState<RiskData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRisk, setHoveredRisk] = useState<number | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('risk', context)
      .then((result) => {
        if (!cancelled) { const d = result as RiskData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Assessing business risks..." section="risk" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('risk', context).then(r => { setData(r as RiskData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  // 2x2 matrix positions
  const matrixCells = [
    { row: 'high', col: 'low', label: 'Monitor', gridRow: 1, gridCol: 1, bg: 'rgba(212,136,15,0.10)' },
    { row: 'high', col: 'medium', label: 'Mitigate', gridRow: 1, gridCol: 2, bg: 'rgba(239,68,68,0.10)' },
    { row: 'high', col: 'high', label: 'Critical', gridRow: 1, gridCol: 3, bg: 'rgba(239,68,68,0.18)' },
    { row: 'medium', col: 'low', label: 'Accept', gridRow: 2, gridCol: 1, bg: 'rgba(45,139,117,0.08)' },
    { row: 'medium', col: 'medium', label: 'Monitor', gridRow: 2, gridCol: 2, bg: 'rgba(212,136,15,0.10)' },
    { row: 'medium', col: 'high', label: 'Mitigate', gridRow: 2, gridCol: 3, bg: 'rgba(239,68,68,0.10)' },
    { row: 'low', col: 'low', label: 'Accept', gridRow: 3, gridCol: 1, bg: 'rgba(45,139,117,0.12)' },
    { row: 'low', col: 'medium', label: 'Accept', gridRow: 3, gridCol: 2, bg: 'rgba(45,139,117,0.08)' },
    { row: 'low', col: 'high', label: 'Monitor', gridRow: 3, gridCol: 3, bg: 'rgba(212,136,15,0.10)' },
  ];

  return (
    <div>
      {/* Overall risk */}
      <div className="rounded-[12px] p-5 mb-8" style={{ backgroundColor: LEVEL_CONFIG[data.overall_risk_level].bg, border: `1px solid ${LEVEL_CONFIG[data.overall_risk_level].color}20` }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: LEVEL_CONFIG[data.overall_risk_level].color }}>
            Overall Risk: {LEVEL_CONFIG[data.overall_risk_level].label}
          </span>
        </div>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.summary}</p>
      </div>

      {/* Risk matrix grid */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Likelihood vs Impact Matrix</p>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr 28px', gap: 2, height: 280 }}>
          {/* Y-axis labels */}
          <div style={{ gridRow: 1, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>HIGH</span>
          </div>
          <div style={{ gridRow: 2, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>MED</span>
          </div>
          <div style={{ gridRow: 3, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>LOW</span>
          </div>

          {/* Matrix cells */}
          {matrixCells.map((cell) => {
            const risksInCell = data.risks.filter(r => r.likelihood === cell.row && r.impact === cell.col);
            return (
              <div key={`${cell.row}-${cell.col}`} className="rounded-[8px] p-2 relative" style={{ gridRow: cell.gridRow, gridColumn: cell.gridCol + 1, backgroundColor: cell.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {risksInCell.map((r, i) => (
                  <div key={i} className="rounded-full px-2 py-0.5" style={{ fontSize: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 400, backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.risk.slice(0, 20)}
                  </div>
                ))}
                {risksInCell.length === 0 && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.4 }}>{cell.label}</span>
                )}
              </div>
            );
          })}

          {/* X-axis labels */}
          <div style={{ gridRow: 4, gridColumn: 2, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>LOW</span>
          </div>
          <div style={{ gridRow: 4, gridColumn: 3, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>MED</span>
          </div>
          <div style={{ gridRow: 4, gridColumn: 4, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>HIGH</span>
          </div>
        </div>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, letterSpacing: '0.04em' }}>IMPACT →</p>
      </div>

      {/* Risk cards */}
      <div className="flex flex-col gap-2">
        {data.risks.map((risk, i) => {
          const isHovered = hoveredRisk === i;
          return (
            <div
              key={i}
              className="rounded-[12px] p-5 transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-card)', border: `1px solid ${isHovered ? 'var(--divider-section)' : 'var(--divider)'}` }}
              onClick={() => setHoveredRisk(isHovered ? null : i)}
              onMouseEnter={() => setHoveredRisk(i)}
              onMouseLeave={() => setHoveredRisk(null)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{risk.risk}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: LEVEL_CONFIG[risk.likelihood].bg, color: LEVEL_CONFIG[risk.likelihood].color }}>
                      {risk.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span style={{ fontSize: 11, fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)' }}>
                      Likelihood: <span style={{ color: LEVEL_CONFIG[risk.likelihood].color, fontWeight: 400 }}>{risk.likelihood}</span>
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)' }}>
                      Impact: <span style={{ color: LEVEL_CONFIG[risk.impact].color, fontWeight: 400 }}>{risk.impact}</span>
                    </span>
                  </div>
                </div>
              </div>
              {isHovered && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
                  <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-teal)', marginBottom: 4 }}>Mitigation</p>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{risk.mitigation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
