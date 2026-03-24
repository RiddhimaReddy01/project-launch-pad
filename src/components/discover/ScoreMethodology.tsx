import type { DiscoverInsight } from '@/lib/discover';

const SCORE_EXPLANATIONS = [
  {
    key: 'frequency_score' as const,
    label: 'Frequency',
    icon: '📊',
    getDesc: (v: number) => {
      if (v >= 0.7) return 'This issue appears very frequently — mentioned across multiple threads, reviews, and discussions.';
      if (v >= 0.4) return 'Moderately discussed — appears in several sources but not dominant.';
      return 'Relatively rare — only a few mentions found across analyzed sources.';
    },
    getMethod: () => 'Counted the number of distinct sources mentioning this topic, divided by total sources analyzed. Cross-referenced across Reddit, Google, and Yelp.',
  },
  {
    key: 'severity_score' as const,
    label: 'Severity',
    icon: '🔥',
    getDesc: (v: number) => {
      if (v >= 0.7) return 'Highly severe — users describe this as a major frustration or dealbreaker.';
      if (v >= 0.4) return 'Moderate impact — users are annoyed but working around it.';
      return 'Low severity — a nice-to-have rather than a must-fix.';
    },
    getMethod: () => 'Analyzed sentiment intensity in source quotes — looking for strong negative language, urgency words, and descriptions of real consequences.',
  },
  {
    key: 'willingness_to_pay' as const,
    label: 'Willingness to Pay',
    icon: '💰',
    getDesc: (v: number) => {
      if (v >= 0.7) return 'Strong pay signal — users explicitly mention budgets, price comparisons, or willingness to switch.';
      if (v >= 0.4) return 'Some pay signal — indirect mentions of value or cost.';
      return 'Weak pay signal — users expect free or low-cost solutions.';
    },
    getMethod: () => 'Looked for pricing discussions, comparisons to paid alternatives, "I would pay for..." statements, and subscription/purchase behavior.',
  },
  {
    key: 'market_size_signal' as const,
    label: 'Market Size',
    icon: '🌍',
    getDesc: (v: number) => {
      if (v >= 0.7) return 'Large potential market — this issue affects many people across demographics.';
      if (v >= 0.4) return 'Medium market — affects a meaningful but specific segment.';
      return 'Niche market — specific to a small group of users.';
    },
    getMethod: () => 'Estimated from breadth of discussion — how many different communities, review sites, and user types mention this issue.',
  },
];

export default function ScoreMethodology({ insight }: { insight: DiscoverInsight }) {
  const composite = insight.composite_score;

  return (
    <div
      className="rounded-[10px] p-4 mb-4"
      style={{ backgroundColor: 'rgba(108,92,231,0.03)', border: '1px solid rgba(108,92,231,0.08)' }}
    >
      <p style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        fontWeight: 400,
        color: 'var(--text-primary)',
        marginBottom: 4,
      }}>
        How this score was calculated
      </p>
      <p style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 11,
        fontWeight: 300,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        marginBottom: 12,
      }}>
        Composite score = Frequency (25%) + Severity (30%) + Pay Signal (25%) + Market Size (20%) → scaled to 0–10
      </p>

      {/* Visual breakdown */}
      <div className="flex flex-col gap-3">
        {SCORE_EXPLANATIONS.map(({ key, label, icon, getDesc, getMethod }) => {
          const value = insight[key];
          const pct = Math.round(value * 100);
          return (
            <div key={key} className="rounded-[8px] p-3" style={{ backgroundColor: 'var(--surface-card)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {icon} {label}
                </span>
                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  color: pct >= 70 ? 'var(--accent-teal)' : pct >= 40 ? 'var(--accent-amber)' : '#8C6B6B',
                }}>
                  {pct}%
                </span>
              </div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>
                {getDesc(value)}
              </p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
                Method: {getMethod()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Final composite */}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--divider-light)' }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-primary)' }}>
          Composite Score
        </span>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 16,
          fontWeight: 400,
          color: composite >= 7 ? 'var(--accent-teal)' : composite >= 4 ? 'var(--accent-amber)' : '#8C6B6B',
        }}>
          {composite.toFixed(1)}/10
        </span>
      </div>
    </div>
  );
}
