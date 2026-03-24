import { useState, useMemo } from 'react';
import type { TimelineResult, TimelinePhase } from '@/lib/setup';
import type { SetupContext } from '@/lib/setup';

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  VALIDATION: { color: 'var(--accent-blue)', bg: 'rgba(74,111,165,0.06)' },
  'BUILD MVP': { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  LAUNCH: { color: 'var(--accent-amber)', bg: 'rgba(184,134,11,0.06)' },
  SCALE: { color: 'var(--accent-primary)', bg: 'rgba(45,107,82,0.06)' },
};

function getPhaseColor(phase: string) {
  const key = phase.toUpperCase();
  for (const [k, v] of Object.entries(PHASE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return PHASE_COLORS.VALIDATION;
}

export default function LaunchTimeline({ data, tier, context }: { data: TimelineResult; tier: string; context: SetupContext | null }) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const totalWeeks = data.phases.reduce((s, p) => s + p.weeks, 0);

  const ganttRows = useMemo(() => {
    let cumulative = 0;
    return data.phases.map((phase, i) => {
      const start = cumulative;
      cumulative += phase.weeks;
      return { ...phase, startWeek: start, endWeek: cumulative, index: i };
    });
  }, [data.phases]);

  // Cumulative budget
  const cumulativeBudget = useMemo(() => {
    let cum = 0;
    return ganttRows.map(r => { cum += r.budget_percent; return cum; });
  }, [ganttRows]);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card-base p-4 text-center">
          <p className="section-label mb-2">Total Duration</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{totalWeeks} weeks</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 2 }}>~{Math.round(totalWeeks / 4.3)} months</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="section-label mb-2">Phases</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{data.phases.length}</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 2 }}>{tier.toUpperCase()} strategy</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="section-label mb-2">Milestones</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{data.phases.reduce((s, p) => s + p.milestones.length, 0)}</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 2 }}>total checkpoints</p>
        </div>
      </div>

      {/* Interactive Gantt Chart */}
      <div className="mb-10">
        <p className="section-label mb-4">
          Launch Timeline -- {tier.toUpperCase()} Tier
        </p>

        {/* Week scale */}
        <div className="flex mb-2" style={{ paddingLeft: 120 }}>
          {Array.from({ length: Math.ceil(totalWeeks / 4) }, (_, i) => (
            <div key={i} style={{ flex: 4, minWidth: 0 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, color: 'var(--text-muted)' }}>W{i * 4 + 1}</span>
            </div>
          ))}
        </div>

        {/* Gantt bars */}
        <div className="flex flex-col gap-1.5">
          {ganttRows.map((row, i) => {
            const pc = getPhaseColor(row.phase);
            const isHovered = hoveredBar === i;
            const isExpanded = expandedPhase === row.phase;
            const leftPct = (row.startWeek / totalWeeks) * 100;
            const widthPct = (row.weeks / totalWeeks) * 100;

            return (
              <div key={i}>
                <div
                  className="flex items-center cursor-pointer transition-all duration-200"
                  style={{ height: 40 }}
                  onClick={() => setExpandedPhase(isExpanded ? null : row.phase)}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div style={{ width: 120, flexShrink: 0, paddingRight: 12 }}>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: isExpanded ? 500 : 400, color: isExpanded ? pc.color : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {row.phase}
                    </span>
                  </div>

                  <div className="flex-1 relative" style={{ height: 28 }}>
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: Math.ceil(totalWeeks / 4) }, (_, j) => (
                        <div key={j} style={{ flex: 4, borderLeft: '1px solid var(--divider-light)' }} />
                      ))}
                    </div>
                    <div
                      className="absolute rounded-[6px] flex items-center justify-center transition-all duration-200"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: 2,
                        bottom: 2,
                        backgroundColor: isHovered || isExpanded ? pc.color : pc.bg,
                        border: `1px solid ${pc.color}${isHovered || isExpanded ? '' : '30'}`,
                      }}
                    >
                      <span style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500,
                        color: isHovered || isExpanded ? '#fff' : pc.color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 6px',
                      }}>
                        {row.weeks}w / {row.budget_percent}%
                      </span>
                    </div>
                  </div>

                  {/* Cumulative badge */}
                  <div style={{ width: 50, flexShrink: 0, textAlign: 'right', paddingLeft: 8 }}>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                      W{row.endWeek}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="ml-[120px] mr-[50px] mb-3 rounded-[10px] p-4 animate-fade-in" style={{ backgroundColor: pc.bg, borderLeft: `3px solid ${pc.color}` }}>
                    <p className="section-label" style={{ color: pc.color, marginBottom: 10 }}>Milestones</p>
                    <div className="flex flex-col gap-2 mb-4">
                      {row.milestones.map((m, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${pc.color}40`, flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                      <p className="section-label" style={{ color: pc.color, marginBottom: 3 }}>Success Metric</p>
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5 }}>{row.success_metric}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget allocation bar */}
      <div className="card-base p-4 mb-6">
        <p className="section-label mb-3">Budget Allocation</p>
        <div className="flex rounded-[6px] overflow-hidden" style={{ height: 24 }}>
          {ganttRows.map((row, i) => {
            const pc = getPhaseColor(row.phase);
            return (
              <div
                key={i}
                style={{ width: `${row.budget_percent}%`, backgroundColor: pc.color, opacity: 0.7, transition: 'opacity 200ms' }}
                className="flex items-center justify-center cursor-default"
                title={`${row.phase}: ${row.budget_percent}%`}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }}
              >
                {row.budget_percent >= 15 && (
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 500, color: '#fff' }}>{row.budget_percent}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {ganttRows.map((row, i) => {
            const pc = getPhaseColor(row.phase);
            return (
              <span key={i} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, color: pc.color }}>{row.phase}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
