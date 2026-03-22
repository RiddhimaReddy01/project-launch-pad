import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AnalyzeContext, OpportunityData, CustomersData, CompetitorsData, RootCauseData, CostsData } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

const OpportunitySizing = lazy(() => import('./OpportunitySizing'));
const CustomerSegments = lazy(() => import('./CustomerSegments'));
const Competitors = lazy(() => import('./Competitors'));
const RootCauses = lazy(() => import('./RootCauses'));
const StartupCostsPreview = lazy(() => import('./StartupCostsPreview'));

const TABS = [
  { key: 'opportunity', label: 'Opportunity', icon: '📊', question: 'Is the market big enough?', autoLoad: true },
  { key: 'customers', label: 'Customers', icon: '👥', question: 'Who exactly to target?', autoLoad: true },
  { key: 'competitors', label: 'Competitors', icon: '⚔️', question: 'Where can I win?', autoLoad: true },
  { key: 'rootcause', label: 'Root Cause', icon: '🔍', question: "Why hasn't this been solved?", autoLoad: false },
  { key: 'costs', label: 'Costs', icon: '💰', question: 'What will it cost to start?', autoLoad: false },
] as const;

type TabKey = typeof TABS[number]['key'];

interface SectionResults {
  opportunity?: OpportunityData;
  customers?: CustomersData;
  competitors?: CompetitorsData;
  rootcause?: RootCauseData;
  costs?: CostsData;
}

export default function AnalyzeModule() {
  const { idea, selectedInsight, decomposeResult, discoverResult } = useIdea();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('opportunity');
  const [activated, setActivated] = useState<Set<TabKey>>(new Set());
  const [sectionResults, setSectionResults] = useState<SectionResults>({});
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Build context from decompose + discover results
  const context: AnalyzeContext | null = decomposeResult ? {
    business_type: decomposeResult.stage1.business_type,
    city: decomposeResult.stage1.location.city,
    state: decomposeResult.stage1.location.state,
    target_customers: decomposeResult.stage2.target_customers,
    price_tier: decomposeResult.stage2.price_tier,
    insight_title: selectedInsight || undefined,
    insight_evidence: discoverResult?.insights
      .filter(i => selectedInsight ? i.title === selectedInsight : true)
      .slice(0, 3)
      .map(i => `${i.title}: ${i.description}`)
      .join('\n') || undefined,
  } : null;

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Auto-activate top 3 sections
  useEffect(() => {
    if (context) {
      const autoTabs = TABS.filter(t => t.autoLoad).map(t => t.key);
      setActivated(new Set(autoTabs));
    }
  }, [context?.business_type]);

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    if (!activated.has(key)) {
      setActivated(prev => new Set(prev).add(key));
    }
  };

  const handleSectionData = (section: TabKey, data: any) => {
    setSectionResults(prev => ({ ...prev, [section]: data }));
  };

  const toggleFinding = (finding: string) => {
    setSelectedFindings(prev => {
      const next = new Set(prev);
      if (next.has(finding)) next.delete(finding);
      else next.add(finding);
      return next;
    });
  };

  const handleSaveAnalysis = async () => {
    if (!user) { toast.error('Sign in to save analysis'); return; }
    try {
      const { data: existing } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('idea_text', idea)
        .maybeSingle();

      const analysisPayload = {
        sections: sectionResults,
        selected_findings: Array.from(selectedFindings),
        saved_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('saved_ideas').update({ analysis_data: analysisPayload as any }).eq('id', existing.id);
      } else {
        await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, analysis_data: analysisPayload as any });
      }
      toast.success('Analysis saved to your account');
    } catch { toast.error('Failed to save analysis'); }
  };

  if (!context) return (
    <div className="text-center py-20">
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'var(--text-muted)' }}>
        Complete the Discover step first to unlock analysis
      </p>
    </div>
  );

  // Gather key findings for selection
  const keyFindings: string[] = [];
  if (sectionResults.opportunity) {
    keyFindings.push(`SOM: ${sectionResults.opportunity.som.formatted} (${sectionResults.opportunity.som.confidence} confidence)`);
  }
  if (sectionResults.customers?.segments) {
    sectionResults.customers.segments.forEach(s => keyFindings.push(`Segment: ${s.name} (Pain ${s.pain_intensity}/10)`));
  }
  if (sectionResults.competitors?.unfilled_gaps) {
    sectionResults.competitors.unfilled_gaps.forEach(g => keyFindings.push(`Gap: ${g}`));
  }
  if (sectionResults.rootcause?.root_causes) {
    sectionResults.rootcause.root_causes.filter(c => c.difficulty === 'easy').forEach(c => keyFindings.push(`Quick win: ${c.title}`));
  }

  const completedCount = Object.keys(sectionResults).length;

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Sticky context */}
      <div className="sticky z-30 rounded-[12px] mb-8 p-4" style={{ top: 80, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.04em', marginBottom: 2 }}>ANALYZING</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
              {context.business_type} — {context.city}, {context.state}
            </p>
          </div>
          {selectedInsight && (
            <div>
              <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.04em', marginBottom: 2 }}>SELECTED INSIGHT</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--accent-purple)', maxWidth: 300 }}>{selectedInsight}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>{completedCount}/5 sections</span>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-nowrap gap-0 mb-8 overflow-x-auto" style={{ borderBottom: '1px solid var(--divider)', scrollbarWidth: 'none' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isLoaded = !!sectionResults[tab.key];
          const isActivated = activated.has(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className="transition-all duration-200 flex-shrink-0 flex items-center gap-1.5"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 400 : 300,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-purple)' : '2px solid transparent',
                padding: '10px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
              {isLoaded && <span style={{ fontSize: 10, color: 'var(--accent-teal)' }}>✅</span>}
              {isActivated && !isLoaded && <span className="animate-pulse" style={{ fontSize: 10, color: 'var(--accent-amber)' }}>⏳</span>}
              {!isActivated && !tab.autoLoad && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Section question */}
      <p className="font-heading mb-6" style={{ fontSize: 22, opacity: 0.4 }}>
        {TABS.find(t => t.key === activeTab)?.question}
      </p>

      {/* Section content */}
      <div style={{ minHeight: 300 }}>
        {!activated.has(activeTab) ? (
          <div className="text-center py-16">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 12 }}>
              Click to load this analysis section
            </p>
            <button
              onClick={() => handleTabClick(activeTab)}
              className="rounded-[10px] px-5 py-2.5"
              style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'Inter', sans-serif" }}
            >
              Run {TABS.find(t => t.key === activeTab)?.label} Analysis
            </button>
          </div>
        ) : (
          <Suspense fallback={<SectionSkeleton />}>
            {activeTab === 'opportunity' && <OpportunitySizing context={context} onData={(d) => handleSectionData('opportunity', d)} />}
            {activeTab === 'customers' && <CustomerSegments context={context} onData={(d) => handleSectionData('customers', d)} />}
            {activeTab === 'competitors' && <Competitors context={context} onData={(d) => handleSectionData('competitors', d)} />}
            {activeTab === 'rootcause' && <RootCauses context={context} onData={(d) => handleSectionData('rootcause', d)} />}
            {activeTab === 'costs' && <StartupCostsPreview context={context} onData={(d) => handleSectionData('costs', d)} />}
          </Suspense>
        )}
      </div>

      {/* Key findings selection (shows when at least 1 section complete) */}
      {keyFindings.length > 0 && (
        <div className="mt-12 rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 4 }}>SELECT KEY FINDINGS TO CARRY FORWARD</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 12 }}>
            These will be passed to the Validate tab for testing
          </p>
          <div className="flex flex-col gap-2">
            {keyFindings.map((finding, i) => {
              const isSelected = selectedFindings.has(finding);
              return (
                <label
                  key={i}
                  className="flex items-start gap-3 rounded-[8px] p-3 cursor-pointer transition-colors duration-150"
                  style={{ backgroundColor: isSelected ? 'rgba(108,92,231,0.04)' : 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFinding(finding)}
                    style={{ marginTop: 2, accentColor: 'var(--accent-purple)' }}
                  />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isSelected ? 400 : 300, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {finding}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-3 mt-10 pt-8" style={{ borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={handleSaveAnalysis}
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, backgroundColor: 'rgba(108,92,231,0.06)', color: 'var(--accent-purple)', border: 'none', cursor: 'pointer' }}
        >
          Save analysis
        </button>
        <button
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--divider-light)', cursor: 'pointer' }}
        >
          Export report
        </button>
        {selectedFindings.size > 0 && (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--accent-purple)', marginLeft: 'auto' }}>
            {selectedFindings.size} findings selected for validation →
          </span>
        )}
      </div>
    </div>
  );
}
