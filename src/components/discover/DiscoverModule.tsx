import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { discoverInsights, type DiscoverResult } from '@/lib/discover';
import DiscoverInsightCard from './DiscoverInsightCard';
import DiscoverLoading from './DiscoverLoading';
import SynthesisPanel from './SynthesisPanel';

function SummaryStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
      <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.12em' }}>{label}</p>
      <p className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: detail ? 6 : 0 }}>{value}</p>
      {detail ? (
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{detail}</p>
      ) : null}
    </article>
  );
}

type Status = 'idle' | 'loading' | 'done' | 'error';

const KNOWN_TABS: Record<string, { label: string }> = {
  pain_point: { label: 'Pain Points' },
  workaround: { label: 'Workarounds' },
  demand_signal: { label: 'Demand Signals' },
  expectation: { label: 'Expectations' },
  market_gap: { label: 'Market Gaps' },
  opportunity: { label: 'Opportunities' },
  trend: { label: 'Trends' },
};

function buildTabs(insights: { type: string }[]) {
  const types = [...new Set(insights.map(i => i.type))];
  return types.map(key => ({
    key,
    label: KNOWN_TABS[key]?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));
}

function SourceSummaryBar({
  summary,
  activePlatform,
  onSelectPlatform,
}: {
  summary: { reddit_count: number; google_count: number; yelp_count: number; total_signals: number };
  activePlatform: 'reddit' | 'google' | 'yelp' | null;
  onSelectPlatform: (platform: 'reddit' | 'google' | 'yelp' | null) => void;
}) {
  const total = summary.total_signals || 1;
  const segments = [
    { key: 'reddit' as const, label: 'Reddit', count: summary.reddit_count, color: '#FF6B35' },
    { key: 'google' as const, label: 'Google', count: summary.google_count, color: '#5B8DEF' },
    { key: 'yelp' as const, label: 'Yelp', count: summary.yelp_count, color: '#EF4444' },
  ].filter(s => s.count > 0);

  return (
    <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
      <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>SOURCE DISTRIBUTION</p>
      <div className="rounded-full overflow-hidden flex" style={{ height: 8, backgroundColor: 'var(--divider)' }}>
        {segments.map((seg, i) => (
          <button key={i} className="animate-progress" onClick={() => onSelectPlatform(activePlatform === seg.key ? null : seg.key)} title={`Filter to ${seg.label} evidence`} style={{
            width: `${(seg.count / total) * 100}%`,
            backgroundColor: seg.color,
            transition: 'width 800ms ease-out',
            border: 'none',
            cursor: 'pointer',
          }} />
        ))}
      </div>
      <div className="flex items-center gap-5 mt-3">
        {segments.map((seg, i) => (
          <button
            key={i}
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            onClick={() => onSelectPlatform(activePlatform === seg.key ? null : seg.key)}
            style={{
              backgroundColor: activePlatform === seg.key ? 'var(--color-accent-soft)' : 'transparent',
              border: `1px solid ${activePlatform === seg.key ? 'rgba(224,90,71,0.2)' : 'var(--divider)'}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: seg.color }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {seg.label} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{seg.count}</span>
            </span>
          </button>
        ))}
        <button onClick={() => onSelectPlatform(null)} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} title="Clear source filter">
          {total} total signals
        </button>
      </div>
      {segments.length === 0 && (
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0, lineHeight: 1.7 }}>
          Source links are still loading or were not included in this saved result yet. Open an insight card to inspect the evidence list.
        </p>
      )}
    </div>
  );
}

function hasInteractiveSources(result: DiscoverResult): boolean {
  return result.insights.some(i =>
    i.sources?.some(s => s.url && s.url !== '#' && s.url.startsWith('http'))
  );
}

export default function DiscoverModule() {
  const { idea, decomposeResult, discoverResult: contextDiscover, setDiscoverResult: setContextDiscover } = useIdea();
  const [status, setStatus] = useState<Status>(contextDiscover ? 'done' : 'idle');
  const [result, setResult] = useState<DiscoverResult | null>(contextDiscover);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [cached, setCached] = useState(!!contextDiscover);
  const [ready, setReady] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'reddit' | 'google' | 'yelp' | null>(null);
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

  useEffect(() => {
    if (!result || status !== 'done') { setReady(false); return; }
    if (hasInteractiveSources(result)) {
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, [result, status]);

  const runDiscover = async () => {
    if (!decomposeResult) return;
    setError(null); setStatus('loading'); setCached(false); setReady(false);
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
  const filtered = result?.insights.filter(i => {
    const matchesType = !filter || i.type === filter;
    const matchesPlatform = !activePlatform || i.sources.some(source => source.platform === activePlatform);
    return matchesType && matchesPlatform;
  }) ?? [];

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>DISCOVER</p>
            <p className="font-heading" style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Market Intelligence</p>
            {result && ready && (
              <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>
                {result.source_summary.total_signals} signals across multiple platforms
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {status === 'done' && ready && (
                <button onClick={() => { hasRun.current = false; runDiscover(); }} className="btn-secondary rounded-lg px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>
                Re-run
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {(status === 'loading' || (status === 'done' && !ready)) && <DiscoverLoading />}

      {status === 'error' && (
        <div className="text-center py-16">
          <div className="rounded-xl p-6 mb-4 inline-block" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--error)' }}>{error}</p>
          </div>
          <div>
            <button onClick={() => { hasRun.current = false; runDiscover(); }} className="btn-primary rounded-xl px-6 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>Retry</button>
          </div>
        </div>
      )}

      {status === 'done' && result && ready && (
        <div className="flex gap-6 animate-fade-in" style={{ alignItems: 'flex-start' }}>
          <div className="flex-1 min-w-0">
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
              <SummaryStat
                label="Demand Strength"
                value={`${result.summary.demand_strength.toFixed(1)} / 10`}
                detail={result.summary.summary || 'Weighted from customer pain, willingness to pay, and signal quality.'}
              />
              <SummaryStat
                label="Signal Density"
                value={result.summary.signal_density ? result.summary.signal_density[0].toUpperCase() + result.summary.signal_density.slice(1) : 'Low'}
                detail={result.summary.trend_label || 'Trend is still stabilizing from the available evidence.'}
              />
              <SummaryStat
                label="Top Regions"
                value={result.summary.top_regions.length ? result.summary.top_regions.slice(0, 3).join(', ') : 'Not enough data'}
                detail="Where demand signals cluster most often in the evidence set."
              />
            </div>

            {result.summary.mixed_signals.length > 0 && (
              <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(185, 124, 44, 0.08)', border: '1px solid rgba(185, 124, 44, 0.18)' }}>
                <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>MIXED SIGNALS</p>
                <div className="flex flex-col gap-2">
                  {result.summary.mixed_signals.map((signal, index) => (
                    <p key={index} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                      {signal}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <SourceSummaryBar summary={result.source_summary} activePlatform={activePlatform} onSelectPlatform={setActivePlatform} />

            {visibleTabs.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                {visibleTabs.map((tab) => {
                  const isActive = filter === tab.key;
                  const count = counts[tab.key] || 0;
                  return (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-all duration-200 whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--surface-card)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--divider)',
                        cursor: 'pointer',
                      }}>
                      {tab.label}
                      <span className="rounded-full px-2 py-0.5" style={{
                        fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: 'center',
                        backgroundColor: isActive ? 'rgba(8,8,16,0.2)' : 'var(--surface-elevated)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <p
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}
                title="Click any insight card to open its evidence, quotes, and source links"
              >
                Tip: click an insight to open the full evidence and source list. Click a source color above to filter by platform.
              </p>
              {filtered.map((insight, i) => (
                <div key={i} className="scroll-reveal" style={{ animationDelay: `${i * 50}ms` }}
                  ref={(el) => { if (el) setTimeout(() => el.classList.add('visible'), 80 + i * 50); }}>
                  <DiscoverInsightCard insight={insight} />
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>No insights match this filter</p>
                </div>
              )}
            </div>
          </div>

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
