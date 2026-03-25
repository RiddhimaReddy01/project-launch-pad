/**
 * Prefetch hook: fires Discover + Analyze + Setup APIs in parallel
 * immediately after decompose completes, so tabs load instantly.
 * Uses simple { idea } format — backend handles decomposition internally.
 */
import { useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { discoverInsights } from '@/lib/discover';
import { analyzeSectionsParallel, type SectionKey } from '@/lib/analyze';
import { setupSection } from '@/lib/setup';

const ALL_SECTIONS: SectionKey[] = [
  'opportunity', 'customers', 'competitors', 'rootcause',
  'costs', 'risk', 'location', 'moat',
];

export function usePrefetch() {
  const {
    idea,
    decomposeResult,
    discoverResult,
    analyzeData,
    setupData,
    setDiscoverResult,
    setAnalyzeData,
    setSetupData,
    setPrefetchStatus,
  } = useIdea();

  const lastIdea = useRef<string | null>(null);

  useEffect(() => {
    if (!decomposeResult || !idea) return;

    const normalizedIdea = idea.trim().toLowerCase();
    if (lastIdea.current === normalizedIdea) return;
    lastIdea.current = normalizedIdea;

    setPrefetchStatus('running');
    console.log('[Prefetch] Starting parallel prefetch for:', idea);

    const hasDiscover = !!discoverResult;
    const hasAnalyze = Object.keys(analyzeData || {}).length > 0;
    const hasSetupCosts = !!setupData?.costs;

    if (hasDiscover && hasAnalyze && hasSetupCosts) {
      setPrefetchStatus('done');
      console.log('[Prefetch] Skipping; saved data already hydrated');
      return;
    }

    const discoverP = hasDiscover
      ? Promise.resolve(discoverResult)
      : discoverInsights(idea)
          .then(data => { setDiscoverResult(data); console.log('[Prefetch] Discover done'); return data; })
          .catch(err => { console.warn('[Prefetch] Discover failed:', err.message); return null; });

    const analyzeP = hasAnalyze
      ? Promise.resolve(analyzeData)
      : analyzeSectionsParallel(ALL_SECTIONS, idea)
          .then(results => {
            const shared: Record<string, any> = {};
            Object.entries(results).forEach(([k, v]) => { if (v.data) shared[k] = v.data; });
            setAnalyzeData(shared);
            console.log('[Prefetch] Analyze done:', Object.keys(shared).length, 'sections');
            return results;
          })
          .catch(err => { console.warn('[Prefetch] Analyze failed:', err.message); return null; });

    const setupP = hasSetupCosts
      ? Promise.resolve(setupData.costs)
      : setupSection('costs', idea, 'MID')
          .then(data => {
            setSetupData((prev: Record<string, any>) => ({ ...prev, tier: 'mid', costs: data }));
            console.log('[Prefetch] Setup costs done');
            return data;
          })
          .catch(err => { console.warn('[Prefetch] Setup failed:', err.message); return null; });

    Promise.allSettled([discoverP, analyzeP, setupP]).then(() => {
      setPrefetchStatus('done');
      console.log('[Prefetch] All complete');
    });
  }, [decomposeResult, idea, discoverResult, analyzeData, setupData, setAnalyzeData, setDiscoverResult, setPrefetchStatus, setSetupData]);
}
