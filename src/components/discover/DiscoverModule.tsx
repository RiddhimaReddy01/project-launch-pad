import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { discoverInsights, type DiscoverResult } from '@/lib/discover';
import DiscoverInsightCard from './DiscoverInsightCard';
import SynthesisPanel from './SynthesisPanel';
import DiscoverLoading from './DiscoverLoading';

type Status = 'idle' | 'loading' | 'done' | 'error';

const TYPE_TABS = [
  { key: 'all', label: 'All', icon: '📊' },
  { key: 'pain_point', label: 'Pain Points', icon: '🔴' },
  { key: 'workaround', label: 'Workarounds', icon: '🔄' },
  { key: 'demand_signal', label: 'Demand Signals', icon: '📈' },
  { key: 'expectation', label: 'Expectations', icon: '💎' },
] as const;

export default function DiscoverModule() {
  const { decomposeResult, setDiscoverResult: setContextDiscover } = useIdea();
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [cached, setCached] = useState(false);
  const [highlightKeyword, setHighlightKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  useEffect(() => {
    if (decomposeResult && !hasRun.current) {
      hasRun.current = true;
      runDiscover();
    }
  }, [decomposeResult]);

  const runDiscover = async () => {
    if (!decomposeResult) return;
    setError(null);
    setStatus('loading');
    setCached(false);

    try {
      const startTime = Date.now();
      const data = await discoverInsights({
        business_type: decomposeResult.stage1.business_type,
        location: decomposeResult.stage1.location,
        search_queries: decomposeResult.stage2.search_queries,
        source_domains: decomposeResult.stage2.source_domains,
        subreddits: decomposeResult.stage2.subreddits,
        target_customers: decomposeResult.stage2.target_customers,
        price_tier: decomposeResult.stage2.price_tier,
      });
      if (Date.now() - startTime < 1000) setCached(true);
      setResult(data);
      setContextDiscover(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching insights');
      setStatus('error');
    }
  };

  if (!decomposeResult) return null;

  const filtered = result?.insights.filter(
    (i) => filter === 'all' || i.type === filter
  ) ?? [];

  // Count per type
  const counts: Record<string, number> = { all: result?.insights.length ?? 0 };
  result?.insights.forEach(i => {
    counts[i.type] = (counts[i.type] || 0) + 1;
  });

  // Check if insight matches highlight keyword
  const isHighlighted = (insight: any) => {
    if (!highlightKeyword) return false;
    const text = `${insight.title} ${insight.description} ${insight.tags.join(' ')}`.toLowerCase();
    return text.includes(highlightKeyword.toLowerCase());
  };

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Section header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Market Intelligence
            </p>
            {result && (
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 300,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}>
                {result.source_summary.total_signals} signals from {result.source_summary.reddit_count} Reddit · {result.source_summary.google_count} Google · {result.source_summary.yelp_count} Yelp
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {cached && (
              <span
                className="rounded-full px-3 py-1"
                style={{
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: 'rgba(45,139,117,0.08)',
                  color: 'var(--accent-teal)',
                }}
              >
                ⚡ Cached
              </span>
            )}
            {status === 'done' && (
              <button
                onClick={() => { hasRun.current = false; runDiscover(); }}
                className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
                style={{
                  fontSize: 12,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  backgroundColor: 'var(--surface-input)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ↻ Re-run
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {status === 'loading' && <DiscoverLoading />}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center py-16">
          <div className="rounded-[12px] p-6 mb-4 inline-block" style={{ backgroundColor: 'rgba(239,68,68,0.06)' }}>
            <p style={{ fontSize: 14, fontFamily: "'Inter', sans-serif", color: 'var(--destructive)' }}>
              {error}
            </p>
          </div>
          <div>
            <button
              onClick={() => { hasRun.current = false; runDiscover(); }}
              className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                backgroundColor: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <>
          {/* Category tabs with counts */}
          <div
            className="flex gap-1 mb-8 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {TYPE_TABS.map((tab) => {
              const isActive = filter === tab.key;
              const count = counts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="flex items-center gap-1.5 rounded-[10px] px-4 py-2 transition-all duration-200 whitespace-nowrap"
                  style={{
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: isActive ? 400 : 300,
                    backgroundColor: isActive ? 'var(--accent-purple)' : 'var(--surface-input)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                  <span
                    className="rounded-full px-1.5 py-0.5"
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--divider-light)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2-column layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT — Insights feed */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {filtered.map((insight, i) => (
                <div
                  key={i}
                  className="scroll-reveal"
                  style={{ animationDelay: `${i * 60}ms` }}
                  ref={(el) => {
                    if (el) setTimeout(() => el.classList.add('visible'), 80 + i * 60);
                  }}
                >
                  <DiscoverInsightCard
                    insight={insight}
                    isHighlighted={isHighlighted(insight)}
                  />
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}>
                    No insights match this filter
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT — Synthesis panel */}
            <div className="lg:w-[320px] flex-shrink-0">
              <SynthesisPanel
                synthesis={result.synthesis}
                onHighlightInsight={setHighlightKeyword}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
