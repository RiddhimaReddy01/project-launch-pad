import { useState, useRef, useEffect, useMemo } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { MOCK_SOURCES, MOCK_INSIGHTS, MOCK_SUMMARY } from '@/data/discover-mock';
import type { Insight, Source } from '@/data/discover-mock';
import SourceBar from './SourceBar';
import FilterPills from './FilterPills';
import InsightCard from './InsightCard';
import MentionsPanel from './MentionsPanel';

export default function DiscoverModule() {
  const { decomposeResult } = useIdea();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mentionsInsight, setMentionsInsight] = useState<Insight | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Build dynamic sources from decompose result
  const sources: Source[] = useMemo(() => {
    if (!decomposeResult) return MOCK_SOURCES;

    const dynamicSources: Source[] = [];

    // Add subreddits
    decomposeResult.stage2.subreddits.forEach((sub, i) => {
      dynamicSources.push({
        id: `reddit_${sub}`,
        name: `r/${sub}`,
        type: 'reddit_local',
        postCount: Math.floor(Math.random() * 80) + 10,
        url: `https://www.reddit.com/r/${sub}/`,
        active: false,
      });
    });

    // Add source domains
    decomposeResult.stage2.source_domains.forEach((domain, i) => {
      const name = domain.replace(/^www\./, '').replace(/\.com$|\.org$/, '');
      dynamicSources.push({
        id: `domain_${i}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        type: 'reviews',
        postCount: Math.floor(Math.random() * 120) + 20,
        url: `https://${domain}`,
        active: false,
      });
    });

    return dynamicSources;
  }, [decomposeResult]);

  const summary = useMemo(() => {
    if (!decomposeResult) return MOCK_SUMMARY;
    return {
      totalSources: sources.length,
      totalSignals: sources.reduce((sum, s) => sum + s.postCount, 0),
    };
  }, [decomposeResult, sources]);

  const filtered = MOCK_INSIGHTS.filter((insight) => {
    if (selectedCategory !== 'all' && insight.type !== selectedCategory) return false;
    if (selectedSource && !insight.sourceIds.includes(selectedSource)) return false;
    return true;
  });

  return (
    <>
      <div
        ref={containerRef}
        className="scroll-reveal"
        style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}
      >
        {/* Section 1 — Status */}
        <div className="text-center mb-12">
          <p className="font-heading" style={{ fontSize: 26 }}>
            Community signals
          </p>
          <p className="font-caption mt-3" style={{ fontSize: 13 }}>
            We scanned {summary.totalSources} sources and analyzed {summary.totalSignals} community signals
          </p>
        </div>

        {/* Section 2 — Source bar */}
        <div className="mb-6">
          <p className="font-caption mb-3" style={{ fontSize: 12, letterSpacing: '0.04em' }}>
            SOURCES
          </p>
          <SourceBar
            sources={sources}
            selectedSourceId={selectedSource}
            onSelectSource={setSelectedSource}
          />
        </div>

        {/* Section 3 — Filter pills */}
        <div className="mb-10">
          <FilterPills selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {/* Section 4 — Insight list */}
        <div className="flex flex-col gap-3">
          {filtered.map((insight, i) => (
            <div
              key={insight.id}
              className="scroll-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
              ref={(el) => {
                if (el) setTimeout(() => el.classList.add('visible'), 100 + i * 80);
              }}
            >
              <InsightCard
                insight={insight}
                sources={sources}
                onSeeMentions={setMentionsInsight}
              />
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="font-caption" style={{ fontSize: 13 }}>
                No insights match this filter combination
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 5 — Mentions side panel */}
      {mentionsInsight && (
        <MentionsPanel
          insight={mentionsInsight}
          onClose={() => setMentionsInsight(null)}
        />
      )}
    </>
  );
}
