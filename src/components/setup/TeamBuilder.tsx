import { useMemo } from 'react';
import type { TeamResult, TeamMember } from '@/lib/setup';

const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  FTE: { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  Contract: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
  Advisory: { color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)' },
};

const PRIORITY_STYLES = {
  MUST_HAVE: { color: 'var(--text-primary)', bg: 'rgba(26,26,26,0.06)', label: 'Must have' },
  NICE_TO_HAVE: { color: 'var(--text-muted)', bg: 'rgba(26,26,26,0.03)', label: 'Nice to have' },
};

export default function TeamBuilder({ data, tier }: { data: TeamResult; tier: string }) {
  const sorted = useMemo(() => [...data.team].sort((a, b) => a.month - b.month), [data.team]);
  const mustHaveCost = useMemo(() => sorted.filter(t => t.priority === 'MUST_HAVE').reduce((s, t) => s + t.salary_min, 0), [sorted]);
  const niceToHaveCost = useMemo(() => sorted.filter(t => t.priority === 'NICE_TO_HAVE').reduce((s, t) => s + t.salary_min, 0), [sorted]);

  const fmt = (n: number) => n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Total Payroll</p>
          <p style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-primary)' }}>{fmt(data.total_payroll)}</p>
        </div>
        <div className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Must Have</p>
          <p style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-primary)' }}>{fmt(mustHaveCost)}</p>
        </div>
        <div className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Nice to Have</p>
          <p style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-muted)' }}>{fmt(niceToHaveCost)}</p>
        </div>
      </div>

      {/* Gantt-style timeline */}
      <div className="mb-8">
        <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Hiring Timeline
        </p>
        <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          {/* Month markers */}
          <div className="flex mb-2" style={{ paddingLeft: 120 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 text-center">
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>M{i + 1}</span>
              </div>
            ))}
          </div>
          {/* Bars */}
          {sorted.map((member, i) => {
            const startPct = ((member.month - 1) / 12) * 100;
            const widthPct = ((13 - member.month) / 12) * 100;
            const typeStyle = TYPE_STYLES[member.type] || TYPE_STYLES.FTE;
            return (
              <div key={i} className="flex items-center mb-1.5" style={{ minHeight: 28 }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.title}
                  </p>
                </div>
                <div className="flex-1 relative" style={{ height: 28 }}>
                  <div
                    className="flex items-center"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      borderRadius: 4,
                      backgroundColor: typeStyle.bg,
                      border: `1px solid ${typeStyle.color}30`,
                    }}
                  >
                    <span style={{ fontSize: 14, color: typeStyle.color, paddingLeft: 8, paddingRight: 6, lineHeight: 1.2 }}>
                      {member.salary_label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
            {Object.entries(TYPE_STYLES).map(([type, style]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: style.bg, border: `1px solid ${style.color}30` }} />
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role cards */}
      <div className="flex flex-col gap-2">
        {sorted.map((member, i) => {
          const typeStyle = TYPE_STYLES[member.type] || TYPE_STYLES.FTE;
          const prioStyle = PRIORITY_STYLES[member.priority] || PRIORITY_STYLES.NICE_TO_HAVE;
          return (
            <div key={i} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-primary)' }}>{member.title}</span>
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 13, letterSpacing: '0.04em', backgroundColor: typeStyle.bg, color: typeStyle.color }}>{member.type}</span>
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 13, letterSpacing: '0.04em', backgroundColor: prioStyle.bg, color: prioStyle.color }}>{prioStyle.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Month {member.month}</span>
              </div>
              <p className="font-heading" style={{ fontSize: 20, marginBottom: 8 }}>{member.salary_label}</p>
              <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{member.why_needed}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
