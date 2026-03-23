import { useState } from 'react';
import type { TimelineResult, TimelinePhase } from '@/lib/setup';
import type { SetupContext } from '@/lib/setup';

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  VALIDATION: { color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)' },
  'BUILD MVP': { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  LAUNCH: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
  SCALE: { color: 'var(--accent-primary)', bg: 'rgba(26,26,26,0.04)' },
};

function formatCurrency(n: number): string {
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function LaunchTimeline({ data, tier, context }: { data: TimelineResult; tier: string; context: SetupContext | null }) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const totalWeeks = data.phases.reduce((s, p) => s + p.weeks, 0);

  return (
    <div>
      {/* Phase bar visualization */}
      <div className="mb-8">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          12-Month Roadmap — {tier.toUpperCase()} Tier
        </p>

        {/* Stacked bar */}
        <div className="flex rounded-[8px] overflow-hidden mb-3" style={{ height: 36 }}>
          {data.phases.map((phase, i) => {
            const pct = (phase.weeks / totalWeeks) * 100;
            const pc = PHASE_COLORS[phase.phase] || PHASE_COLORS.VALIDATION;
            return (
              <div
                key={i}
                onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
                className="flex items-center justify-center cursor-pointer transition-opacity duration-200 hover:opacity-80"
                style={{ width: `${pct}%`, backgroundColor: pc.bg, borderRight: i < data.phases.length - 1 ? '2px solid var(--surface-bg)' : 'none' }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: pc.color, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                  {phase.phase}
                </span>
              </div>
            );
          })}
        </div>

        {/* Week markers */}
        <div className="flex justify-between">
          {data.phases.map((phase, i) => {
            const pc = PHASE_COLORS[phase.phase] || PHASE_COLORS.VALIDATION;
            return (
              <div key={i} className="flex-1 text-center">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)' }}>{phase.weeks}w</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>({phase.budget_percent}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div className="flex flex-col gap-2">
        {data.phases.map((phase, i) => {
          const pc = PHASE_COLORS[phase.phase] || PHASE_COLORS.VALIDATION;
          const isOpen = expandedPhase === phase.phase;

          return (
            <div key={i} className="rounded-[12px] transition-all duration-200" style={{ backgroundColor: 'var(--surface-card)', border: `1px solid ${isOpen ? pc.color + '30' : 'var(--divider)'}` }}>
              <button onClick={() => setExpandedPhase(isOpen ? null : phase.phase)}
                className="w-full text-left p-5 flex items-start gap-4"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <div className="flex-shrink-0 flex items-center justify-center rounded-[8px]" style={{ width: 36, height: 36, backgroundColor: pc.bg }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: pc.color }}>{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{phase.phase}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: pc.bg, color: pc.color }}>{phase.weeks} weeks</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: 'rgba(26,26,26,0.03)', color: 'var(--text-muted)' }}>{phase.budget_percent}% budget</span>
                  </div>
                  {!isOpen && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 4 }}>
                      {phase.milestones[0]}
                    </p>
                  )}
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', flexShrink: 0, marginTop: 4 }}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />

                  {/* Milestones */}
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Milestones</p>
                  <div className="flex flex-col gap-2 mb-5">
                    {phase.milestones.map((m, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid var(--divider-section)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m}</p>
                      </div>
                    ))}
                  </div>

                  {/* Success metric */}
                  <div className="rounded-[10px] p-4" style={{ backgroundColor: pc.bg, borderLeft: `3px solid ${pc.color}` }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: pc.color, marginBottom: 4 }}>Success Metric</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.6 }}>{phase.success_metric}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-6 rounded-[10px] p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(26,26,26,0.02)', border: '1px solid var(--divider)' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>Total timeline</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{totalWeeks} weeks (~{Math.round(totalWeeks / 4.3)} months)</span>
      </div>
    </div>
  );
}
