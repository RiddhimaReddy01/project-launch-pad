import { useState, useRef, useEffect } from 'react';
import type { DiscoverInsight } from '@/lib/discover';
import { useIdea } from '@/context/IdeaContext';
import ScoreDonut from './ScoreDonut';

const TYPE_CONFIG = {
  pain_point: { label: 'PAIN POINT', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
  workaround: { label: 'WORKAROUND', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.06)' },
  demand_signal: { label: 'DEMAND SIGNAL', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.06)' },
  expectation: { label: 'EXPECTATION', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.06)' },
};

const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  reddit: { icon: '🟠', label: 'Reddit', color: '#FF4500' },
  google: { icon: '🔵', label: 'Google', color: '#4285F4' },
  yelp: { icon: '🔴', label: 'Yelp', color: '#D32323' },
};

function MiniBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--divider-light)' }}>
        <div
          className="rounded-full h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--accent-purple)',
            transition: 'width 600ms ease-out',
          }}
        />
      </div>
    </div>
  );
}

export default function DiscoverInsightCard({ insight, isHighlighted, onHighlight }: {
  insight: DiscoverInsight;
  isHighlighted?: boolean;
  onHighlight?: (title: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const { setSelectedInsight, setCurrentStep } = useIdea();
  const config = TYPE_CONFIG[insight.type];

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded]);

  // Unique platforms in sources
  const platforms = [...new Set(insight.sources.map(s => s.platform))];

  return (
    <div
      className="rounded-[14px] transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface-card)',
        boxShadow: isHighlighted
          ? `0 0 0 2px ${config.color}, 0 4px 20px rgba(0,0,0,0.08)`
          : expanded
            ? '0 4px 20px rgba(0,0,0,0.06)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 200ms ease-out',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Visual score donut */}
          <ScoreDonut score={insight.composite_score} color={config.color} />

          <div className="flex-1 min-w-0">
            {/* Type badge + source chips row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="inline-block rounded-full px-2.5 py-0.5"
                style={{
                  fontSize: 10,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  backgroundColor: config.bg,
                  color: config.color,
                }}
              >
                {config.label}
              </span>

              {/* Clickable source platform chips */}
              {platforms.map(p => {
                const meta = PLATFORM_META[p] || { icon: '📌', label: p, color: 'var(--text-muted)' };
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      fontSize: 10,
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {meta.icon} {meta.label}
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      ({insight.sources.filter(s => s.platform === p).length})
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Title */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.45,
            }}>
              {insight.title}
            </p>

            {/* Description */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginTop: 6,
            }}>
              {insight.description}
            </p>

            {/* Score bars */}
            <div className="flex gap-3 mt-4">
              <MiniBar label="Frequency" value={insight.frequency_score} />
              <MiniBar label="Severity" value={insight.severity_score} />
              <MiniBar label="Pay Signal" value={insight.willingness_to_pay} />
              <MiniBar label="Market Size" value={insight.market_size_signal} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {insight.tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    fontSize: 11,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    backgroundColor: 'var(--surface-input)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Expand hint */}
            <div className="mt-3 flex items-center gap-1">
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 300,
                color: 'var(--accent-purple)',
              }}>
                {expanded ? '▾ Hide evidence' : `▸ ${insight.sources.length} sources — click to expand`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded evidence */}
      <div
        style={{
          height: expanded ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'height 300ms ease-out',
        }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />

          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 12 }}>
            EVIDENCE ({insight.sources.length} sources)
          </p>

          <div className="flex flex-col gap-3">
            {insight.sources.map((source, i) => {
              const meta = PLATFORM_META[source.platform] || { icon: '📌', label: source.platform, color: 'var(--text-muted)' };
              return (
                <div
                  key={i}
                  className="rounded-[10px] p-4"
                  style={{ backgroundColor: 'var(--surface-input)' }}
                >
                  <p style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                  }}>
                    "{source.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span style={{ fontSize: 12 }}>{meta.icon}</span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="transition-colors duration-150"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: 'var(--accent-purple)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      {source.author} →
                    </a>
                    {source.upvotes != null && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                        ↑ {source.upvotes}
                      </span>
                    )}
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                      {source.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInsight(insight.title);
                setCurrentStep('analyze');
              }}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                backgroundColor: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Deep dive this opportunity →
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                backgroundColor: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ★ Save Insight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
