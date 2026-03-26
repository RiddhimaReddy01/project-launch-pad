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
  const [selectedRisk, setSelectedRisk] = useState<number | null>(null);

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
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>Retry</button>
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

  const severityBand = (likelihood: keyof typeof likelihoodVal, impact: keyof typeof impactVal) => {
    const score = likelihoodVal[likelihood] * impactVal[impact];
    if (score <= 3) return 'low' as const;
    if (score <= 6) return 'medium' as const;
    return 'high' as const;
  };

  let countHigh = 0;
  let countMedium = 0;
  let countLow = 0;
  for (const r of data.risks) {
    const band = severityBand(r.likelihood, r.impact);
    if (band === 'high') countHigh += 1;
    else if (band === 'medium') countMedium += 1;
    else countLow += 1;
  }

  return (
    <div>
      {/* Overall risk */}
      <div className="rounded-[16px] p-6 mb-8" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: LEVEL_CONFIG[data.overall_risk_level].color }}>
            Overall Risk: {LEVEL_CONFIG[data.overall_risk_level].label}
          </span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{data.summary}</p>
      </div>

      {/* Risk matrix grid */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Likelihood vs Impact Matrix</p>

        <div
          className="flex flex-wrap items-center gap-2 mb-3"
          style={{ fontSize: 14 }}
        >
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 font-semibold"
            style={{ backgroundColor: LEVEL_CONFIG.high.bg, color: LEVEL_CONFIG.high.color }}
          >
            {countHigh} High
          </span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 font-semibold"
            style={{ backgroundColor: LEVEL_CONFIG.medium.bg, color: LEVEL_CONFIG.medium.color }}
          >
            {countMedium} Medium
          </span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 font-semibold"
            style={{ backgroundColor: LEVEL_CONFIG.low.bg, color: LEVEL_CONFIG.low.color }}
          >
            {countLow} Low
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gridTemplateRows: 'auto 120px 120px 120px 28px auto', gap: 8 }}>
          <div style={{ gridRow: 1, gridColumn: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>LIKELIHOOD ↑</span>
          </div>
          <div style={{ gridRow: 1, gridColumn: 2, gridColumnEnd: 5 }} />

          {/* Y-axis labels */}
          <div style={{ gridRow: 2, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>HIGH</span>
          </div>
          <div style={{ gridRow: 3, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>MED</span>
          </div>
          <div style={{ gridRow: 4, gridColumn: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>LOW</span>
          </div>

          {/* Matrix cells */}
          {matrixCells.map((cell) => {
            const risksInCell = data.risks.filter(r => r.likelihood === cell.row && r.impact === cell.col);
            const visible = risksInCell.slice(0, 2);
            const more = risksInCell.length - visible.length;
            return (
              <div key={`${cell.row}-${cell.col}`} className="rounded-[16px] p-2 relative" style={{ gridRow: cell.gridRow + 1, gridColumn: cell.gridCol + 1, backgroundColor: cell.bg, border: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 6, minHeight: 0 }}>
                {visible.map((r, idx) => (
                  <button
                    key={`${cell.row}-${cell.col}-${idx}`}
                    type="button"
                    className="rounded-full w-full"
                    title={r.risk}
                    onClick={() => setSelectedRisk(data.risks.indexOf(r))}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: 'var(--text-primary)',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      border: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      lineHeight: 1.25,
                    }}
                  >
                    {r.risk}
                  </button>
                ))}
                {more > 0 && (
                  <span
                    className="text-center rounded-full py-1"
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.5)' }}
                  >
                    +{more} more
                  </span>
                )}
                {risksInCell.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', opacity: 0.85, textAlign: 'center' }}>{cell.label}</span>
                )}
              </div>
            );
          })}

          {/* X-axis labels */}
          <div style={{ gridRow: 5, gridColumn: 2, textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>LOW</span>
          </div>
          <div style={{ gridRow: 5, gridColumn: 3, textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>MED</span>
          </div>
          <div style={{ gridRow: 5, gridColumn: 4, textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>HIGH</span>
          </div>

          <div style={{ gridRow: 6, gridColumn: 2, gridColumnEnd: 5, textAlign: 'center', paddingTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>IMPACT →</span>
          </div>
        </div>
      </div>
      {selectedRisk !== null && data.risks[selectedRisk] && (
        <div className="rounded-[16px] p-5 mb-8" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label mb-2" style={{ fontWeight: 700, fontSize: 14 }}>Selected Risk</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{data.risks[selectedRisk].risk}</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{data.risks[selectedRisk].mitigation}</p>
            </div>
            <button onClick={() => setSelectedRisk(null)} className="btn-secondary rounded-lg px-3 py-1.5" style={{ fontSize: 14, fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}

      {/* Risk cards */}
      <div className="flex flex-col gap-3">
        {data.risks.map((risk, i) => (
          <div
            key={i}
            className="rounded-[16px] p-5 transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => setSelectedRisk(selectedRisk === i ? null : i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRisk(selectedRisk === i ? null : i); } }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{risk.risk}</span>
                  <span className="rounded-full px-2.5 py-0.5 shrink-0" style={{ fontSize: 14, letterSpacing: '0.04em', backgroundColor: LEVEL_CONFIG[risk.likelihood].bg, color: LEVEL_CONFIG[risk.likelihood].color }}>
                    {risk.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Likelihood: <span style={{ color: LEVEL_CONFIG[risk.likelihood].color, fontWeight: 600 }}>{risk.likelihood}</span>
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Impact: <span style={{ color: LEVEL_CONFIG[risk.impact].color, fontWeight: 600 }}>{risk.impact}</span>
                  </span>
                </div>
                <p className="font-caption mb-1" style={{ fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-teal)' }}>Mitigation</p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {risk.mitigation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
