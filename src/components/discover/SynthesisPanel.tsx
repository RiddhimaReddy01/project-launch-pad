import { useState } from 'react';
import type { DiscoverSynthesis } from '@/lib/discover';

function OpportunityGauge({ score }: { score: number }) {
  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(score / 100, 1);
  const offset = circumference * (1 - pct);

  const color =
    score >= 70 ? 'var(--accent-primary)' :
    score >= 40 ? 'var(--accent-amber)' :
    'var(--error)';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none" stroke="var(--divider)" strokeWidth={strokeWidth} strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <span style={{ fontSize: 28, fontWeight: 700, color, marginTop: -20 }}>
        {score}
      </span>
      <span className="section-label" style={{ marginTop: 4, fontWeight: 700 }}>
        OPPORTUNITY SCORE
      </span>
    </div>
  );
}

function ClickableSection({
  title, items, onItemClick, activeItem,
}: {
  title: string; items: string[];
  onItemClick?: (item: string) => void; activeItem?: string | null;
}) {
  return (
    <div className="mb-5">
      <p className="section-label" style={{ marginBottom: 8, fontWeight: 700 }}>{title}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => {
          const isActive = activeItem === item;
          return (
            <div
              key={i}
              className="rounded-lg px-3 py-2.5 transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: isActive ? 'rgba(0,212,230,0.06)' : 'transparent',
                border: isActive ? '1px solid rgba(0,212,230,0.2)' : '1px solid transparent',
              }}
              onClick={() => onItemClick?.(item)}
            >
              <p style={{
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}>
                {item}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SynthesisPanel({
  synthesis, onHighlightInsight,
}: {
  synthesis: DiscoverSynthesis; onHighlightInsight?: (keyword: string) => void;
}) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleClick = (item: string) => {
    const next = activeItem === item ? null : item;
    setActiveItem(next);
    onHighlightInsight?.(next || '');
  };

  return (
    <div
      className="rounded-xl p-6 lg:sticky"
      style={{ top: 120, backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
    >
      <p className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
        Founder Synthesis
      </p>

      <OpportunityGauge score={synthesis.opportunity_score} />

      <div style={{ height: 1, backgroundColor: 'var(--divider-section)', margin: '20px 0' }} />

      <ClickableSection title="TOP PAIN POINTS" items={synthesis.top_pain_points} onItemClick={handleClick} activeItem={activeItem} />
      <ClickableSection title="WHAT THEY DO INSTEAD" items={synthesis.current_workarounds} onItemClick={handleClick} activeItem={activeItem} />
      <ClickableSection title="WHAT THEY VALUE" items={synthesis.what_they_value} onItemClick={handleClick} activeItem={activeItem} />
      <ClickableSection title="WILLINGNESS TO PAY" items={synthesis.willingness_signals} onItemClick={handleClick} activeItem={activeItem} />
    </div>
  );
}
