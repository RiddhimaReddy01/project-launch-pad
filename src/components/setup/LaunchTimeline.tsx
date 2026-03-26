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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card-base p-5 text-center">
          <p className="section-label mb-2">Total Duration</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{totalWeeks} weeks</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            ~{Math.round(totalWeeks / 4.3)} months
          </p>
        </div>
        <div className="card-base p-5 text-center">
          <p className="section-label mb-2">Phases</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{data.phases.length}</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            {tier.toUpperCase()} strategy
          </p>
        </div>
        <div className="card-base p-5 text-center">
          <p className="section-label mb-2">Milestones</p>
          <p className="font-heading" style={{ fontSize: 22 }}>{data.phases.reduce((s, p) => s + p.milestones.length, 0)}</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            total checkpoints
          </p>
        </div>
      </div>

      {/* Interactive Gantt Chart */}
      <div className="mb-10">
        <p className="section-label mb-4">
          Launch Timeline -- {tier.toUpperCase()} Tier
        </p>

        {/* Week scale */}
        <div className="flex mb-2.5" style={{ paddingLeft: 120 }}>
          {Array.from({ length: Math.ceil(totalWeeks / 4) }, (_, i) => (
            <div key={i} style={{ flex: 4, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>W{i * 4 + 1}</span>
            </div>
          ))}
        </div>

        {/* Gantt bars */}
        <div className="flex flex-col gap-2">
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
                  style={{ height: 44 }}
                  onClick={() => setExpandedPhase(isExpanded ? null : row.phase)}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div style={{ width: 120, flexShrink: 0, paddingRight: 12 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: isExpanded ? pc.color : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {row.phase}
                    </span>
                  </div>

                  <div className="flex-1 relative" style={{ height: 30 }}>
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
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: isHovered || isExpanded ? '#fff' : pc.color,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          padding: '0 8px',
                        }}
                      >
                        {row.weeks}w / {row.budget_percent}%
                      </span>
                    </div>
                  </div>

                  {/* Cumulative badge */}
                  <div style={{ width: 52, flexShrink: 0, textAlign: 'right', paddingLeft: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                      W{row.endWeek}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="ml-[120px] mr-[52px] mb-4 rounded-[10px] p-5 animate-fade-in shadow-sm"
                    style={{ backgroundColor: pc.bg, borderLeft: `3px solid ${pc.color}` }}
                  >
                    <p className="section-label" style={{ color: pc.color, marginBottom: 12 }}>Milestones</p>
                    <div className="flex flex-col gap-3 mb-4">
                      {row.milestones.map((m, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: `1.5px solid ${pc.color}40`,
                              flexShrink: 0,
                              marginTop: 4,
                            }}
                          />
                          <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{m}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-[8px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                      <p className="section-label" style={{ color: pc.color, marginBottom: 6 }}>Success Metric</p>
                      <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.6 }}>{row.success_metric}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget allocation bar */}
      <div className="card-base p-5 mb-6">
        <p className="section-label mb-4">Budget Allocation</p>
        <div className="flex rounded-[8px] overflow-hidden border border-[var(--divider-light)]" style={{ height: 28 }}>
          {ganttRows.map((row, i) => {
            const pc = getPhaseColor(row.phase);
            return (
              <div
                key={i}
                style={{ width: `${row.budget_percent}%`, backgroundColor: pc.color, opacity: 0.7, transition: 'opacity 200ms' }}
                className="flex items-center justify-center cursor-default min-w-0"
                title={`${row.phase}: ${row.budget_percent}%`}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }}
              >
                {row.budget_percent >= 15 && (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{row.budget_percent}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between gap-2 mt-3">
          {ganttRows.map((row, i) => {
            const pc = getPhaseColor(row.phase);
            return (
              <span key={i} style={{ fontSize: 14, fontWeight: 500, color: pc.color, lineHeight: 1.4 }}>
                {row.phase}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
