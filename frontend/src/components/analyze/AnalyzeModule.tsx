import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useIdea } from '@/context/IdeaContext';
import SectionSkeleton from './SectionSkeleton';
import { useAnalyzeSection } from '@/hooks/use-research';
import {
  mapOpportunity,
  mapDemandBehavior,
  mapSegments,
  mapCompetitors,
  mapMarketStructure,
  mapRootCauses,
  mapStrategic,
  mapCostsPreview,
} from '@/lib/transform';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '../common/EmptyState';

const OpportunitySizing = lazy(() => import('./OpportunitySizing'));
const DemandBehavior = lazy(() => import('./DemandBehavior'));
const CustomerSegments = lazy(() => import('./CustomerSegments'));
const Competitors = lazy(() => import('./Competitors'));
const MarketStructure = lazy(() => import('./MarketStructure'));
const RootCauses = lazy(() => import('./RootCauses'));
const StrategicSnapshot = lazy(() => import('./StrategicSnapshot'));
const StartupCostsPreview = lazy(() => import('./StartupCostsPreview'));

const TABS = [
  { key: 'sizing', label: 'Opportunity sizing' },
  { key: 'demand', label: 'Demand & behavior' },
  { key: 'segments', label: 'Customer segments' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'structure', label: 'Market structure' },
  { key: 'rootcause', label: 'Why it still exists' },
  { key: 'strategic', label: 'Strategic snapshot' },
  { key: 'costs', label: 'Startup costs' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function AnalyzeModule() {
  const { idea, selectedInsight } = useIdea();
  const [activeTab, setActiveTab] = useState<TabKey>('sizing');
  const [loaded, setLoaded] = useState<Set<TabKey>>(new Set(['sizing']));
  const [ready, setReady] = useState<Set<TabKey>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const sizingQuery = useAnalyzeSection('opportunity');
  const demandQuery = useAnalyzeSection('customers');
  const competitorsQuery = useAnalyzeSection('competitors');
  const rootQuery = useAnalyzeSection('rootcause');
  const costsQuery = useAnalyzeSection('costs');

  useEffect(() => {
    const err = sizingQuery.error || demandQuery.error || competitorsQuery.error || rootQuery.error || costsQuery.error;
    if (err) {
      toast({
        title: 'Analysis unavailable',
        description: err instanceof Error ? err.message : 'Unexpected error.',
        variant: 'destructive',
      });
    }
  }, [sizingQuery.error, demandQuery.error, competitorsQuery.error, rootQuery.error, costsQuery.error, toast]);

  useEffect(() => {
    if (!loaded.has(activeTab)) {
      setLoaded((prev) => new Set(prev).add(activeTab));
    }
    if (!ready.has(activeTab)) {
      const timer = setTimeout(() => {
        setReady((prev) => new Set(prev).add(activeTab));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeTab, loaded, ready]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  const showSkeleton = !ready.has(activeTab);
  const insightTitle = selectedInsight?.title ?? 'Select an insight to analyze';
  const insightScore = Math.round(selectedInsight?.score ?? 0);

  const view = useMemo(
    () => ({
      market: mapOpportunity(sizingQuery.data),
      demand: mapDemandBehavior(demandQuery.data),
      segments: mapSegments(demandQuery.data),
      competitors: mapCompetitors(competitorsQuery.data),
      structure: mapMarketStructure(competitorsQuery.data),
      root: mapRootCauses(rootQuery.data),
      strategic: mapStrategic(rootQuery.data),
      costs: mapCostsPreview(costsQuery.data),
    }),
    [sizingQuery.data, demandQuery.data, competitorsQuery.data, rootQuery.data, costsQuery.data],
  );

  const hasLiveData = Boolean(
    sizingQuery.data ||
      demandQuery.data ||
      competitorsQuery.data ||
      rootQuery.data ||
      costsQuery.data,
  );

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 920, margin: '0 auto', padding: '0 24px' }}>
      {/* Sticky context strip */}
      <div
        className="sticky z-30 rounded-[12px] mb-12 p-5"
        style={{
          top: 80,
          backgroundColor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {idea || 'No idea yet'}
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {insightTitle}
            </p>
          </div>
          <div>
            <div
              className="flex items-center justify-center rounded-[8px]"
              style={{
                width: 44,
                height: 44,
                backgroundColor: 'rgba(108,92,231,0.1)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--accent-purple)',
              }}
            >
              {insightScore}
            </div>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="mb-16">
        <p className="font-caption" style={{ fontSize: 16, letterSpacing: '0.04em', marginBottom: 10, fontWeight: 500 }}>
          MARKET INTELLIGENCE
        </p>
        <p className="font-heading" style={{ fontSize: 28, marginBottom: 12, lineHeight: 1.2 }}>
          Is this a real opportunity?
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.75,
            color: 'var(--text-secondary)',
            maxWidth: 560,
          }}
        >
          We analyze demand, customer behavior, competition, and structure so you can decide quickly with confidence.
        </p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex flex-nowrap gap-0 mb-12 overflow-x-auto hide-scrollbar"
        style={{ borderBottom: '1px solid var(--divider)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="transition-all duration-200 active:scale-[0.97] flex-shrink-0"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                fontWeight: isActive ? 400 : 300,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-purple)' : '2px solid transparent',
                padding: '10px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div style={{ minHeight: 300 }}>
        {showSkeleton ? (
          <SectionSkeleton />
        ) : (
          <Suspense fallback={<SectionSkeleton />}>
            {activeTab === 'sizing' &&
              (view.market ? (
                <OpportunitySizing marketSizes={view.market} />
              ) : (
                <EmptyState message={hasLiveData ? 'No sizing data returned.' : 'Run discovery and pick an insight to analyze.'} />
              ))}
            {activeTab === 'demand' &&
              (view.demand ? (
                <DemandBehavior data={view.demand} />
              ) : (
                <EmptyState message={hasLiveData ? 'No demand signals returned.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'segments' &&
              (view.segments ? (
                <CustomerSegments segments={view.segments} />
              ) : (
                <EmptyState message={hasLiveData ? 'No segments generated.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'competitors' &&
              (view.competitors ? (
                <Competitors competitors={view.competitors} />
              ) : (
                <EmptyState message={hasLiveData ? 'No competitors found.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'structure' &&
              (view.structure ? (
                <MarketStructure data={view.structure} />
              ) : (
                <EmptyState message={hasLiveData ? 'No structure data yet.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'rootcause' &&
              (view.root ? (
                <RootCauses causes={view.root} />
              ) : (
                <EmptyState message={hasLiveData ? 'No root causes returned.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'strategic' &&
              (view.strategic ? (
                <StrategicSnapshot data={view.strategic} />
              ) : (
                <EmptyState message={hasLiveData ? 'No strategic takeaways yet.' : 'Select an insight first.'} />
              ))}
            {activeTab === 'costs' &&
              (view.costs ? (
                <StartupCostsPreview data={view.costs} />
              ) : (
                <EmptyState message={hasLiveData ? 'No cost preview returned.' : 'Select an insight first.'} />
              ))}
          </Suspense>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="flex flex-wrap items-center gap-3 mt-20 pt-8"
        style={{ borderTop: '1px solid var(--divider)' }}
      >
        <button
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 400,
            backgroundColor: 'rgba(108,92,231,0.06)',
            color: 'var(--accent-purple)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Save analysis
        </button>
        <button
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 300,
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--divider-light)',
            cursor: 'pointer',
          }}
        >
          Export report
        </button>
      </div>
    </div>
  );
}
