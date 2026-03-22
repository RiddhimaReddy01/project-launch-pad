import { useState, useRef, useEffect } from 'react';
import type { DiscoverInsight } from '@/lib/discover';
import { useIdea } from '@/context/IdeaContext';

const TYPE_CONFIG = {
  pain_point: { label: 'PAIN POINT', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
  workaround: { label: 'WORKAROUND', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.06)' },
  demand_signal: { label: 'DEMAND SIGNAL', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.06)' },
  expectation: { label: 'EXPECTATION', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.06)' },
};

const PLATFORM_ICONS: Record<string, string> = {
  reddit: '🟠',
  google: '🔵',
  yelp: '🔴',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="font-caption" style={{ fontSize: 11 }}>{label}</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--divider-light)' }}>
        <div
          className="rounded-full h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: 'var(--accent-purple)' }}
        />
      </div>
    </div>
  );
}

export default function DiscoverInsightCard({ insight }: { insight: DiscoverInsight }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const { setSelectedInsight, setCurrentStep } = useIdea();
  const config = TYPE_CONFIG[insight.type];

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded]);

  return (
    <div
      className="rounded-[14px] transition-shadow duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface-card)',
        boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Composite score */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-[10px]"
            style={{
              width: 44,
              height: 44,
              backgroundColor: config.bg,
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 400,
              color: config.color,
            }}
          >
            {insight.composite_score.toFixed(1)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <span
              className="inline-block rounded-full px-2.5 py-0.5 mb-2"
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
            <p className="font-caption mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {insight.description}
            </p>

            {/* Score row */}
            <div className="flex gap-4 mt-4">
              <ScoreBar label="Frequency" value={insight.frequency_score} />
              <ScoreBar label="Severity" value={insight.severity_score} />
              <ScoreBar label="Pay Signal" value={insight.willingness_to_pay} />
              <ScoreBar label="Market Size" value={insight.market_size_signal} />
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

          <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
            EVIDENCE ({insight.sources.length} sources)
          </p>

          <div className="flex flex-col gap-3">
            {insight.sources.map((source, i) => (
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
                  <span style={{ fontSize: 12 }}>{PLATFORM_ICONS[source.platform] || '📌'}</span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: 'var(--accent-purple)',
                    }}
                  >
                    {source.author}
                  </a>
                  {source.upvotes != null && (
                    <span className="font-caption" style={{ fontSize: 11 }}>↑ {source.upvotes}</span>
                  )}
                  <span className="font-caption" style={{ fontSize: 11 }}>{source.date}</span>
                </div>
              </div>
            ))}
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
