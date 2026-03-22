import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { discoverInsights, type DiscoverResult } from '@/lib/discover';
import DiscoverInsightCard from './DiscoverInsightCard';
import SynthesisPanel from './SynthesisPanel';
import DiscoverLoading from './DiscoverLoading';

type Status = 'idle' | 'loading' | 'done' | 'error';

const TYPE_FILTERS = [
  { key: 'all', label: 'All Insights' },
  { key: 'pain_point', label: 'Pain Points' },
  { key: 'workaround', label: 'Workarounds' },
  { key: 'demand_signal', label: 'Demand Signals' },
  { key: 'expectation', label: 'Expectations' },
] as const;

export default function DiscoverModule() {
  const { decomposeResult, setDiscoverResult: setContextDiscover } = useIdea();
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [cached, setCached] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Auto-run when decompose result is available
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

      // If it returned instantly, it was cached
      if (Date.now() - startTime < 1000) {
        setCached(true);
      }

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

  const locationStr = decomposeResult.stage1.location.city
    ? `${decomposeResult.stage1.location.city}, ${decomposeResult.stage1.location.state}`
    : '';

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="font-heading" style={{ fontSize: 24 }}>
            {decomposeResult.stage1.business_type}
            {locationStr && (
              <span style={{ fontSize: 16, fontWeight: 300, fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)', marginLeft: 8 }}>
                — {locationStr}
              </span>
            )}
          </p>
          {result && (
            <p className="font-caption mt-1" style={{ fontSize: 12 }}>
              {result.source_summary.total_signals} signals from {result.source_summary.reddit_count} Reddit + {result.source_summary.google_count} Google + {result.source_summary.yelp_count} Yelp sources
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
              ⚡ Cached result
            </span>
          )}
          {status === 'done' && (
            <button
              onClick={() => { hasRun.current = false; runDiscover(); }}
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
              Re-run Discovery
            </button>
          )}
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
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {TYPE_FILTERS.map((f) => {
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="rounded-full px-4 py-1.5 transition-all duration-200"
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
                  {f.label}
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
                  <DiscoverInsightCard insight={insight} />
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-caption" style={{ fontSize: 13 }}>
                    No insights match this filter
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT — Synthesis panel */}
            <div className="lg:w-[320px] flex-shrink-0">
              <SynthesisPanel synthesis={result.synthesis} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
