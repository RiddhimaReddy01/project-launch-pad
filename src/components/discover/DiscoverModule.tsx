import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { discoverInsights, type DiscoverResult } from '@/lib/discover';
import DiscoverInsightCard from './DiscoverInsightCard';
import DiscoverLoading from './DiscoverLoading';
import SynthesisPanel from './SynthesisPanel';

type Status = 'idle' | 'loading' | 'done' | 'error';

const KNOWN_TABS: Record<string, { label: string; icon: string }> = {
  pain_point: { label: 'Pain Points', icon: '🔥' },
  workaround: { label: 'Workarounds', icon: '🔧' },
  demand_signal: { label: 'Demand Signals', icon: '📈' },
  expectation: { label: 'Expectations', icon: '🎯' },
  market_gap: { label: 'Market Gaps', icon: '🕳️' },
  opportunity: { label: 'Opportunities', icon: '💡' },
  trend: { label: 'Trends', icon: '📊' },
};

function buildTabs(insights: { type: string }[]) {
  const types = [...new Set(insights.map(i => i.type))];
  return types.map(key => ({
    key,
    label: KNOWN_TABS[key]?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: KNOWN_TABS[key]?.icon || '•',
  }));
}

function SourceSummaryBar({ summary }: { summary: { reddit_count: number; google_count: number; yelp_count: number; total_signals: number } }) {
  const total = summary.total_signals || 1;
  const segments = [
    { label: 'Reddit', count: summary.reddit_count, color: '#C84B31' },
    { label: 'Google', count: summary.google_count, color: '#4285F4' },
    { label: 'Yelp', count: summary.yelp_count, color: '#AF0606' },
  ].filter(s => s.count > 0);

  return (
    <div className="card-base p-4 mb-6">
      <p className="font-section-label mb-3">SOURCE DISTRIBUTION</p>
      <div className="rounded-full overflow-hidden flex" style={{ height: 8, backgroundColor: 'var(--divider-light)' }}>
        {segments.map((seg, i) => (
          <div key={i} className="animate-progress" style={{
            width: `${(seg.count / total) * 100}%`,
            backgroundColor: seg.color,
            transition: 'width 800ms ease-out',
          }} />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: seg.color }} />
            <span className="font-body" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {seg.label} <span style={{ fontWeight: 400 }}>{seg.count}</span>
            </span>
          </div>
        ))}
        <span className="font-body" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {total} total signals
        </span>
      </div>
    </div>
  );
}

export default function DiscoverModule() {
  const { idea, decomposeResult, discoverResult: contextDiscover, setDiscoverResult: setContextDiscover } = useIdea();
  const [status, setStatus] = useState<Status>(contextDiscover ? 'done' : 'idle');
  const [result, setResult] = useState<DiscoverResult | null>(contextDiscover);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [cached, setCached] = useState(!!contextDiscover);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(!!contextDiscover);

  useEffect(() => {
    if (contextDiscover && !result && status !== 'loading') {
      setResult(contextDiscover); setStatus('done'); setCached(true); hasRun.current = true;
    }
  }, [contextDiscover]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  useEffect(() => {
    if (decomposeResult && !hasRun.current) { hasRun.current = true; runDiscover(); }
  }, [decomposeResult]);

  useEffect(() => {
    if (result && !filter) {
      const tabs = buildTabs(result.insights);
      if (tabs[0]) setFilter(tabs[0].key);
    }
  }, [result]);

  const runDiscover = async () => {
    if (!decomposeResult) return;
    setError(null); setStatus('loading'); setCached(false);
    try {
      const startTime = Date.now();
      const data = await discoverInsights(idea);
      if (Date.now() - startTime < 1000) setCached(true);
      setResult(data); setContextDiscover(data); setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong'); setStatus('error');
    }
  };

  if (!decomposeResult) return null;

  const counts = result ? result.insights.reduce((c: Record<string, number>, i) => { c[i.type] = (c[i.type] || 0) + 1; return c; }, {}) : {};
  const visibleTabs = result ? buildTabs(result.insights) : [];
  const filtered = result?.insights.filter(i => !filter || i.type === filter) ?? [];

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-section-label mb-2">DISCOVER</p>
            <p className="font-heading" style={{ fontSize: 22, marginBottom: 4 }}>Market Intelligence</p>
            {result && (
              <p className="font-caption" style={{ marginTop: 4 }}>
                {result.source_summary.total_signals} signals across {result.source_summary.reddit_count + result.source_summary.google_count + result.source_summary.yelp_count > 0 ? '3 platforms' : 'multiple platforms'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {cached && <span className="badge badge-green">⚡ Cached</span>}
            {status === 'done' && (
              <button onClick={() => { hasRun.current = false; runDiscover(); }} className="btn-secondary" style={{ fontSize: 12 }}>
                ↻ Re-run
              </button>
            )}
          </div>
        </div>
      </div>

      {status === 'loading' && <DiscoverLoading />}

      {status === 'error' && (
        <div className="text-center py-16">
          <div className="card-base p-6 mb-4 inline-block" style={{ borderColor: 'var(--error)' }}>
            <p className="font-body" style={{ fontSize: 14, color: 'var(--error)' }}>{error}</p>
          </div>
          <div>
            <button onClick={() => { hasRun.current = false; runDiscover(); }} className="btn-primary">Retry</button>
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Source distribution bar */}
            <SourceSummaryBar summary={result.source_summary} />

            {/* Category tabs */}
            {visibleTabs.length > 1 && (
              <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                {visibleTabs.map((tab) => {
                  const isActive = filter === tab.key;
                  const count = counts[tab.key] || 0;
                  return (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                      className="flex items-center gap-1.5 rounded-md px-3 py-2 transition-all duration-200 whitespace-nowrap"
                      style={{
                        fontSize: 12, fontFamily: "'Outfit', sans-serif",
                        fontWeight: isActive ? 400 : 300,
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--surface-input)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--divider)',
                        cursor: 'pointer',
                      }}>
                      <span style={{ fontSize: 12 }}>{tab.icon}</span>
                      {tab.label}
                      <span className="rounded-full px-1.5 py-0.5" style={{
                        fontSize: 10, fontWeight: 400, minWidth: 18, textAlign: 'center',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--divider-light)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Insights */}
            <div className="flex flex-col gap-3">
              {filtered.map((insight, i) => (
                <div key={i} className="scroll-reveal" style={{ animationDelay: `${i * 50}ms` }}
                  ref={(el) => { if (el) setTimeout(() => el.classList.add('visible'), 80 + i * 50); }}>
                  <DiscoverInsightCard insight={insight} />
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-caption">No insights match this filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Synthesis sidebar — only on wider screens */}
          {result.synthesis && result.synthesis.opportunity_score > 0 && (
            <div className="hidden lg:block" style={{ width: 300, flexShrink: 0 }}>
              <SynthesisPanel synthesis={result.synthesis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
