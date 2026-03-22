import type { DiscoverSynthesis } from '@/lib/discover';

function SynthesisSection({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div className="mb-6">
      <p className="font-caption mb-2" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
        {icon} {title}
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <p
            key={i}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function SynthesisPanel({ synthesis }: { synthesis: DiscoverSynthesis }) {
  const scoreColor =
    synthesis.opportunity_score >= 70
      ? 'var(--accent-teal)'
      : synthesis.opportunity_score >= 40
        ? 'var(--accent-amber)'
        : '#EF4444';

  return (
    <div
      className="rounded-[14px] p-6 lg:sticky"
      style={{
        top: 120,
        backgroundColor: 'var(--surface-card)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <p className="font-heading mb-6" style={{ fontSize: 18 }}>
        Key Takeaways
      </p>

      {/* Opportunity Score */}
      <div className="text-center mb-8">
        <p className="font-caption mb-2" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
          OPPORTUNITY SIGNAL SCORE
        </p>
        <div
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            border: `3px solid ${scoreColor}`,
            fontFamily: "'Inter', sans-serif",
            fontSize: 24,
            fontWeight: 400,
            color: scoreColor,
          }}
        >
          {synthesis.opportunity_score}
        </div>
      </div>

      <SynthesisSection
        title="TOP PAIN POINTS"
        items={synthesis.top_pain_points}
        icon="🔴"
      />

      <SynthesisSection
        title="WHAT THEY DO INSTEAD"
        items={synthesis.current_workarounds}
        icon="🔄"
      />

      <SynthesisSection
        title="WHAT THEY VALUE"
        items={synthesis.what_they_value}
        icon="💎"
      />

      <SynthesisSection
        title="PAY SIGNALS"
        items={synthesis.willingness_signals}
        icon="💰"
      />
    </div>
  );
}
