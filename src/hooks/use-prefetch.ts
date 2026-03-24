/**
 * Prefetch hook: fires Discover + Analyze + Setup APIs in parallel
 * immediately after decompose completes, so tabs load instantly.
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

function decomposeKey(d: { stage1: { business_type: string; location: { city: string; state: string } } }): string {
  return `${d.stage1.business_type}|${d.stage1.location.city}|${d.stage1.location.state}`;
}

export function usePrefetch() {
  const {
    decomposeResult,
    setDiscoverResult,
    setAnalyzeData,
    setSetupData,
    setPrefetchStatus,
  } = useIdea();

  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!decomposeResult) return;

    const key = decomposeKey(decomposeResult);
    if (lastKey.current === key) return;
    lastKey.current = key;

    const decomp = decomposeResult;
    setPrefetchStatus('running');
    console.log('[Prefetch] Starting parallel prefetch for:', key);

    const discoverP = discoverInsights({
      business_type: decomp.stage1.business_type,
      location: decomp.stage1.location,
      search_queries: decomp.stage2.search_queries,
      source_domains: decomp.stage2.source_domains,
      subreddits: decomp.stage2.subreddits,
      target_customers: decomp.stage2.target_customers,
      price_tier: decomp.stage2.price_tier,
    })
      .then(data => { setDiscoverResult(data); console.log('[Prefetch] Discover done'); return data; })
      .catch(err => { console.warn('[Prefetch] Discover failed:', err.message); return null; });

    const analyzeCtx = {
      business_type: decomp.stage1.business_type,
      city: decomp.stage1.location.city,
      state: decomp.stage1.location.state,
      target_customers: decomp.stage2.target_customers,
      price_tier: decomp.stage2.price_tier,
    };

    const analyzeP = analyzeSectionsParallel(ALL_SECTIONS, analyzeCtx)
      .then(results => {
        const shared: Record<string, any> = {};
        Object.entries(results).forEach(([k, v]) => { if (v.data) shared[k] = v.data; });
        setAnalyzeData(shared);
        console.log('[Prefetch] Analyze done:', Object.keys(shared).length, 'sections');
        return results;
      })
      .catch(err => { console.warn('[Prefetch] Analyze failed:', err.message); return null; });

    const setupCtx = {
      business_type: decomp.stage1.business_type,
      city: decomp.stage1.location.city,
      state: decomp.stage1.location.state,
      target_customers: decomp.stage2.target_customers,
      tier: 'mid',
    };

    const setupP = setupSection('costs', setupCtx)
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
  }, [decomposeResult]);
}
