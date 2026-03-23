import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setupSection, type SetupContext, type SetupCostsData, type SetupSuppliersData, type SetupTeamData, type SetupTimelineData } from '@/lib/setup';
import type { LaunchTier, CostCategory, TimelinePhase, TeamRole, Supplier } from '@/data/setup-mock';
import { MOCK_TIERS, MOCK_TIER_COSTS, MOCK_TEAM, MOCK_TIMELINE, MOCK_SUPPLIERS } from '@/data/setup-mock';
import CostBuilder from './CostBuilder';
import Suppliers from './Suppliers';
import TeamBuilder from './TeamBuilder';
import LaunchTimeline from './LaunchTimeline';
import PlanSummary from './PlanSummary';
import SectionSkeleton from '@/components/analyze/SectionSkeleton';

type Estimate = 'low' | 'mid' | 'high';

const TABS = [
  { key: 'costs', label: 'Costs', subtitle: 'Launch budget by tier' },
  { key: 'suppliers', label: 'Suppliers', subtitle: 'Local partners' },
  { key: 'team', label: 'Team', subtitle: 'Hiring plan' },
  { key: 'timeline', label: 'Timeline', subtitle: 'Launch phases' },
  { key: 'summary', label: 'Summary', subtitle: 'Full plan overview' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface SectionState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'completed' | 'error';
  error?: string;
}

export default function SetupModule() {
  const { idea, selectedInsight, decomposeResult } = useIdea();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('costs');
  const [selectedTier, setSelectedTier] = useState('recommended');
  const [estimates, setEstimates] = useState<Record<string, Estimate>>({});
  const [includedRoles, setIncludedRoles] = useState<Set<string>>(new Set());
  const [phases, setPhases] = useState<TimelinePhase[]>([]);

  // AI-generated data states
  const [costsState, setCostsState] = useState<SectionState<SetupCostsData>>({ data: null, status: 'idle' });
  const [suppliersState, setSuppliersState] = useState<SectionState<SetupSuppliersData>>({ data: null, status: 'idle' });
  const [teamState, setTeamState] = useState<SectionState<SetupTeamData>>({ data: null, status: 'idle' });
  const [timelineState, setTimelineState] = useState<SectionState<SetupTimelineData>>({ data: null, status: 'idle' });

  const context: SetupContext | null = useMemo(() => {
    if (!decomposeResult) return null;
    return {
      business_type: decomposeResult.stage1.business_type,
      city: decomposeResult.stage1.location.city,
      state: decomposeResult.stage1.location.state,
      target_customers: decomposeResult.stage2?.target_customers,
      tier: selectedTier,
    };
  }, [decomposeResult, selectedTier]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Auto-load costs on mount
  useEffect(() => {
    if (context && costsState.status === 'idle') loadSection('costs');
  }, [context]);

  const loadSection = useCallback(async (section: 'costs' | 'suppliers' | 'team' | 'timeline') => {
    if (!context) return;
    const setters = { costs: setCostsState, suppliers: setSuppliersState, team: setTeamState, timeline: setTimelineState };
    setters[section]({ data: null, status: 'loading' });
    try {
      const result = await setupSection(section, context);
      setters[section]({ data: result as any, status: 'completed' });

      // Initialize derived state
      if (section === 'team' && (result as SetupTeamData).team) {
        setIncludedRoles(new Set((result as SetupTeamData).team.slice(0, 2).map(r => r.id)));
      }
      if (section === 'timeline' && (result as SetupTimelineData).phases) {
        setPhases((result as SetupTimelineData).phases.map(p => ({ ...p, tasks: p.tasks.map(t => ({ ...t, completed: false })) })));
      }
    } catch (err: any) {
      setters[section]({ data: null, status: 'error', error: err.message });
    }
  }, [context]);

  // Load tab data on tab switch
  useEffect(() => {
    if (!context) return;
    if (activeTab === 'suppliers' && suppliersState.status === 'idle') loadSection('suppliers');
    if (activeTab === 'team' && teamState.status === 'idle') loadSection('team');
    if (activeTab === 'timeline' && timelineState.status === 'idle') loadSection('timeline');
  }, [activeTab, context]);

  const handleEstimateChange = useCallback((itemLabel: string, est: Estimate) => {
    setEstimates(prev => ({ ...prev, [itemLabel]: est }));
  }, []);

  const handleToggleRole = useCallback((id: string) => {
    setIncludedRoles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleTask = useCallback((phaseId: string, taskId: string) => {
    setPhases(prev => prev.map(p =>
      p.id === phaseId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } : p
    ));
  }, []);

  // Use AI data or fallback to mock
  const tiers = costsState.data?.tiers || MOCK_TIERS;
  const tierCosts = costsState.data?.tierCosts || MOCK_TIER_COSTS;
  const suppliers = suppliersState.data?.suppliers || MOCK_SUPPLIERS;
  const team = teamState.data?.team || MOCK_TEAM;
  const timelinePhases = phases.length > 0 ? phases : MOCK_TIMELINE;

  const currentTotal = useMemo(() => {
    const categories = tierCosts[selectedTier] || [];
    let total = 0;
    categories.forEach(cat => cat.items.forEach(item => { total += item[estimates[item.label] || 'mid']; }));
    return total;
  }, [selectedTier, estimates, tierCosts]);

  const insightTitle = selectedInsight || idea;

  const renderTab = () => {
    switch (activeTab) {
      case 'costs':
        if (costsState.status === 'loading') return <SectionSkeleton label="Generating cost tiers for your business..." />;
        if (costsState.status === 'error') return <ErrorState message={costsState.error} onRetry={() => loadSection('costs')} />;
        return <CostBuilder selectedTier={selectedTier} onSelectTier={setSelectedTier} estimates={estimates} onEstimateChange={handleEstimateChange} />;
      case 'suppliers':
        if (suppliersState.status === 'loading') return <SectionSkeleton label="Finding local suppliers and partners..." />;
        if (suppliersState.status === 'error') return <ErrorState message={suppliersState.error} onRetry={() => loadSection('suppliers')} />;
        return <Suppliers />;
      case 'team':
        if (teamState.status === 'loading') return <SectionSkeleton label="Building your team plan..." />;
        if (teamState.status === 'error') return <ErrorState message={teamState.error} onRetry={() => loadSection('team')} />;
        return <TeamBuilder includedRoles={includedRoles} onToggleRole={handleToggleRole} />;
      case 'timeline':
        if (timelineState.status === 'loading') return <SectionSkeleton label="Planning your launch timeline..." />;
        if (timelineState.status === 'error') return <ErrorState message={timelineState.error} onRetry={() => loadSection('timeline')} />;
        return <LaunchTimeline phases={timelinePhases} onToggleTask={handleToggleTask} />;
      case 'summary':
        return <PlanSummary selectedTier={selectedTier} currentTotal={currentTotal} includedRoles={includedRoles} phases={timelinePhases} />;
    }
  };

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
      {/* Sticky context strip */}
      <div className="sticky z-30 rounded-[12px] mb-12 p-5" style={{ top: 80, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>IDEA</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.4 }}>{idea}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>SELECTED OPPORTUNITY</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.4 }}>{insightTitle}</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>MODEL</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--accent-purple)' }}>
              {tiers.find(t => t.id === selectedTier)?.title || 'Recommended'}
            </p>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="mb-10">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>LAUNCH PLAN</p>
        <p className="font-heading" style={{ fontSize: 26, marginBottom: 12 }}>How would you actually start this?</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 300, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 540 }}>
          AI-generated costs, suppliers, team, and timeline tailored to your business and location.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-10">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="relative px-4 py-3 transition-all duration-200 active:scale-[0.97] whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isActive ? 400 : 300, color: isActive ? 'var(--accent-purple)' : 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                {tab.label}
                {isActive && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 1.5, backgroundColor: 'var(--accent-purple)', borderRadius: 1 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="mb-16" style={{ minHeight: 300 }}>{renderTab()}</div>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-3 mt-8 pt-8" style={{ borderTop: '1px solid var(--divider)' }}>
        <button className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, backgroundColor: 'rgba(108,92,231,0.06)', color: 'var(--accent-purple)', border: 'none', cursor: 'pointer' }}
          onClick={async () => {
            if (!user) { toast.error('Sign in to save'); return; }
            try {
              const payload = { tiers, tierCosts, team, suppliers, phases: timelinePhases, selectedTier, currentTotal, savedAt: new Date().toISOString() };
              const { data: existing } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
              if (existing) await supabase.from('saved_ideas').update({ setup_data: payload as any }).eq('id', existing.id);
              else await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, setup_data: payload as any });
              toast.success('Plan saved');
            } catch { toast.error('Failed to save'); }
          }}>
          Save plan
        </button>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>Could not generate this section.</p>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>{message || 'Try again'}</p>
      <button onClick={onRetry} className="rounded-[10px] px-5 py-2.5"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );
}
