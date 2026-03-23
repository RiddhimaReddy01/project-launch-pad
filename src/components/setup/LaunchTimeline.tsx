import { useState, useMemo } from 'react';
import type { TimelineResult, TimelinePhase } from '@/lib/setup';
import type { SetupContext } from '@/lib/setup';

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  VALIDATION: { color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)' },
  'BUILD MVP': { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  LAUNCH: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
  SCALE: { color: 'var(--accent-primary)', bg: 'rgba(26,26,26,0.04)' },
};

export default function LaunchTimeline({ data, tier, context }: { data: TimelineResult; tier: string; context: SetupContext | null }) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const totalWeeks = data.phases.reduce((s, p) => s + p.weeks, 0);

  // Build Gantt rows with cumulative start weeks
  const ganttRows = useMemo(() => {
    let cumulative = 0;
    return data.phases.map((phase, i) => {
      const start = cumulative;
      cumulative += phase.weeks;
      return { ...phase, startWeek: start, endWeek: cumulative, index: i };
    });
  }, [data.phases]);

  return (
    <div>
      {/* Interactive Gantt Chart */}
      <div className="mb-10">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
          Launch Timeline — {tier.toUpperCase()} Tier · {totalWeeks} weeks
        </p>

        {/* Week scale */}
        <div className="flex mb-2" style={{ paddingLeft: 120 }}>
          {Array.from({ length: Math.ceil(totalWeeks / 4) }, (_, i) => (
            <div key={i} style={{ flex: 4, minWidth: 0 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: 'var(--text-muted)' }}>W{i * 4 + 1}</span>
            </div>
          ))}
        </div>

        {/* Gantt bars */}
        <div className="flex flex-col gap-1.5">
          {ganttRows.map((row, i) => {
            const pc = PHASE_COLORS[row.phase] || PHASE_COLORS.VALIDATION;
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
                  {/* Phase label */}
                  <div style={{ width: 120, flexShrink: 0, paddingRight: 12 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: isExpanded ? 500 : 400, color: isExpanded ? pc.color : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {row.phase}
                    </span>
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative" style={{ height: 28 }}>
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: Math.ceil(totalWeeks / 4) }, (_, j) => (
                        <div key={j} style={{ flex: 4, borderLeft: '1px solid var(--divider-light)' }} />
                      ))}
                    </div>
                    {/* Bar */}
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
                        fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
                        color: isHovered || isExpanded ? '#fff' : pc.color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 6px',
                      }}>
                        {row.weeks}w · {row.budget_percent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="ml-[120px] mb-3 rounded-[10px] p-4 animate-fade-in" style={{ backgroundColor: pc.bg, borderLeft: `3px solid ${pc.color}` }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: pc.color, marginBottom: 10 }}>Milestones</p>
                    <div className="flex flex-col gap-2 mb-4">
                      {row.milestones.map((m, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${pc.color}40`, flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-[8px] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: pc.color, marginBottom: 3 }}>Success Metric</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5 }}>{row.success_metric}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-[10px] p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(26,26,26,0.02)', border: '1px solid var(--divider)' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>Total timeline</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{totalWeeks} weeks (~{Math.round(totalWeeks / 4.3)} months)</span>
      </div>
    </div>
  );
}
