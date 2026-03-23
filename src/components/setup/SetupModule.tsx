import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setupSection, type SetupContext, type CostsResult, type SuppliersResult, type TeamResult, type TimelineResult, type TierDef } from '@/lib/setup';
import SectionSkeleton from '@/components/analyze/SectionSkeleton';
import CostBuilder from './CostBuilder';
import Suppliers from './Suppliers';
import TeamBuilder from './TeamBuilder';
import LaunchTimeline from './LaunchTimeline';

type TierId = 'lean' | 'mid' | 'premium';

const TIER_MONOS: Record<string, string> = { lean: 'L', mid: 'M', premium: 'P' };

const TABS = [
  { key: 'costs' as const, label: 'Costs', mono: '$', subtitle: 'Launch budget by tier' },
  { key: 'suppliers' as const, label: 'Suppliers', mono: 'S', subtitle: 'Tier-appropriate vendors' },
  { key: 'team' as const, label: 'Team', mono: 'T', subtitle: 'Year 1 hiring plan' },
  { key: 'timeline' as const, label: 'Timeline', mono: 'R', subtitle: '4-phase roadmap' },
];

type TabKey = typeof TABS[number]['key'];

interface SectionState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'completed' | 'error';
  error?: string;
}

export default function SetupModule() {
  const { idea, decomposeResult, setSetupData } = useIdea();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedTier, setSelectedTier] = useState<TierId>('mid');
  const [activeTab, setActiveTab] = useState<TabKey>('costs');
  const [exporting, setExporting] = useState(false);

  const [costsState, setCostsState] = useState<SectionState<CostsResult>>({ data: null, status: 'idle' });
  const [suppliersState, setSuppliersState] = useState<SectionState<SuppliersResult>>({ data: null, status: 'idle' });
  const [teamState, setTeamState] = useState<SectionState<TeamResult>>({ data: null, status: 'idle' });
  const [timelineState, setTimelineState] = useState<SectionState<TimelineResult>>({ data: null, status: 'idle' });

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

  const loadSection = useCallback(async (section: TabKey) => {
    if (!context) return;
    const setters = { costs: setCostsState, suppliers: setSuppliersState, team: setTeamState, timeline: setTimelineState };
    setters[section]({ data: null, status: 'loading' });
    try {
      const result = await setupSection(section, context);
      setters[section]({ data: result as any, status: 'completed' });
    } catch (err: any) {
      setters[section]({ data: null, status: 'error', error: err.message });
    }
  }, [context]);

  // Auto-load costs on mount
  useEffect(() => {
    if (context && costsState.status === 'idle') loadSection('costs');
  }, [context]);

  // Load tab data on switch
  useEffect(() => {
    if (!context) return;
    const states = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState };
    if (states[activeTab].status === 'idle') loadSection(activeTab);
  }, [activeTab, context]);

  // Re-fetch suppliers/team/timeline when tier changes
  useEffect(() => {
    if (!context) return;
    if (suppliersState.status === 'completed') loadSection('suppliers');
    if (teamState.status === 'completed') loadSection('team');
    if (timelineState.status === 'completed') loadSection('timeline');
  }, [selectedTier]);

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save'); return; }
    try {
      const payload = {
        tier: selectedTier,
        costs: costsState.data,
        suppliers: suppliersState.data,
        team: teamState.data,
        timeline: timelineState.data,
        saved_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
      if (existing) await supabase.from('saved_ideas').update({ setup_data: payload as any }).eq('id', existing.id);
      else await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, setup_data: payload as any, current_step: 'setup' });
      toast.success('Plan saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    const printWin = window.open('', '_blank');
    if (!printWin) { setExporting(false); return; }
    const biz = context?.business_type || idea;
    const loc = context ? `${context.city}, ${context.state}` : '';

    let html = `<!DOCTYPE html><html><head><title>LaunchLens Setup — ${biz}</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
      h1{font-size:24px;font-weight:400;margin-bottom:4px}h2{font-size:18px;font-weight:500;margin:28px 0 12px;border-bottom:1px solid #e5e5e5;padding-bottom:8px}
      .meta{font-size:13px;color:#999;margin-bottom:32px}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      td,th{text-align:left;padding:6px 10px;border-bottom:1px solid #eee}th{font-weight:500;color:#666}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px}@media print{body{margin:20px}}</style>
    </head><body>
      <h1>${biz}</h1><p class="meta">${loc} — ${selectedTier.toUpperCase()} Tier — Generated ${new Date().toLocaleDateString()}</p>`;

    if (costsState.data) {
      const tier = costsState.data.tiers.find(t => t.id === selectedTier);
      html += `<h2>Cost Estimate</h2>`;
      if (tier) html += `<p><strong>$${(tier.cost_min/1000).toFixed(0)}K – $${(tier.cost_max/1000).toFixed(0)}K</strong> · ${tier.philosophy}</p>`;
      const cats = costsState.data.breakdown[selectedTier];
      if (cats) {
        html += `<table><tr><th>Category</th><th>Item</th><th>Range</th></tr>`;
        cats.forEach(c => c.items.forEach(i => { html += `<tr><td>${c.category}</td><td>${i.label}</td><td>$${(i.min/1000).toFixed(0)}K – $${(i.max/1000).toFixed(0)}K</td></tr>`; }));
        html += `</table>`;
      }
    }
    if (suppliersState.data) {
      html += `<h2>Recommended Vendors</h2><table><tr><th>Category</th><th>Name</th><th>Cost</th></tr>`;
      suppliersState.data.suppliers.forEach(s => { html += `<tr><td>${s.category}</td><td>${s.name}</td><td>${s.cost}</td></tr>`; });
      html += `</table>`;
    }
    if (teamState.data) {
      html += `<h2>Year 1 Team</h2><table><tr><th>Role</th><th>Type</th><th>Month</th><th>Salary</th></tr>`;
      teamState.data.team.forEach(t => { html += `<tr><td>${t.title}</td><td>${t.type}</td><td>M${t.month}</td><td>${t.salary_label}</td></tr>`; });
      html += `</table>`;
    }
    if (timelineState.data) {
      html += `<h2>Launch Roadmap</h2>`;
      timelineState.data.phases.forEach(p => {
        html += `<h3 style="font-size:14px;margin:16px 0 6px">${p.phase} — ${p.weeks} weeks (${p.budget_percent}% budget)</h3>`;
        html += `<ul style="font-size:13px;line-height:1.8;color:#444">${p.milestones.map(m => `<li>${m}</li>`).join('')}</ul>`;
        html += `<p style="font-size:12px;color:#666">Success: ${p.success_metric}</p>`;
      });
    }

    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => { printWin.print(); setExporting(false); }, 500);
  }, [context, costsState.data, suppliersState.data, teamState.data, timelineState.data, selectedTier, idea]);

  const completedCount = [costsState, suppliersState, teamState, timelineState].filter(s => s.status === 'completed').length;

  if (!decomposeResult) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 400 }}>
        <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Complete the Discover step first</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Setup needs your business context from the decomposition step.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    const state = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState }[activeTab];

    if (state.status === 'loading') return <SectionSkeleton label={`Generating ${activeTab} plan for ${selectedTier} tier...`} />;
    if (state.status === 'error') return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>Could not generate this section.</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>{state.error || 'Try again'}</p>
        <button onClick={() => loadSection(activeTab)} className="rounded-[10px] px-5 py-2.5"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
    if (state.status === 'idle') return <SectionSkeleton label="Initializing..." />;

    switch (activeTab) {
      case 'costs': return costsState.data ? <CostBuilder data={costsState.data} selectedTier={selectedTier} onSelectTier={setSelectedTier} /> : null;
      case 'suppliers': return suppliersState.data ? <Suppliers data={suppliersState.data} tier={selectedTier} /> : null;
      case 'team': return teamState.data ? <TeamBuilder data={teamState.data} tier={selectedTier} /> : null;
      case 'timeline': return timelineState.data ? <LaunchTimeline data={timelineState.data} tier={selectedTier} context={context} /> : null;
    }
  };

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>SETUP</p>
          <p className="font-heading" style={{ fontSize: 24, marginBottom: 4 }}>Launch Plan</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            AI-generated costs, vendors, team, and timeline for your {selectedTier} tier launch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <>
              <button onClick={handleSave} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={handleExportPDF} disabled={exporting} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </>
          )}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>{completedCount}/4</span>
        </div>
      </div>

      {/* Tier selector */}
      <div className="mb-10">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          Select launch strategy
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(['lean', 'mid', 'premium'] as const).map((tier) => {
            const isSelected = selectedTier === tier;
            const tierData = costsState.data?.tiers.find(t => t.id === tier);
            const labels = {
              lean: { title: 'Lean', sub: 'Speed + DIY', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$30–50K', weeks: tierData?.timeline_weeks || 16, team: tierData?.team_size || '1', best: tierData?.best_for || 'MVPs, services' },
              mid: { title: 'Balanced', sub: 'Quality + team', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$75–100K', weeks: tierData?.timeline_weeks || 24, team: tierData?.team_size || '1–2', best: tierData?.best_for || 'Most startups' },
              premium: { title: 'Premium', sub: 'Full buildout', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$150–200K', weeks: tierData?.timeline_weeks || 32, team: tierData?.team_size || '2–3+', best: tierData?.best_for || 'Complex products' },
            }[tier];

            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className="text-left rounded-[12px] p-5 transition-all duration-200 active:scale-[0.97]"
                style={{
                  backgroundColor: isSelected ? 'rgba(26,26,26,0.03)' : 'var(--surface-card)',
                  border: isSelected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--divider)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: isSelected ? 'var(--text-primary)' : 'var(--divider-light)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                  }}>
                    {TIER_MONOS[tier]}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isSelected ? 500 : 400, color: 'var(--text-primary)' }}>
                    {labels.title}
                  </span>
                </div>
                <p className="font-heading" style={{ fontSize: 20, marginBottom: 4 }}>{labels.cost}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {labels.team} people · {labels.weeks} weeks
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 6 }}>
                  {labels.best}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto hide-scrollbar pb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const state = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState }[tab.key];
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-2 px-4 py-3 transition-all duration-200 whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isActive ? 400 : 300, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 5, fontSize: 9, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                backgroundColor: state.status === 'completed' ? 'var(--text-primary)' : isActive ? 'rgba(26,26,26,0.08)' : 'var(--divider-light)',
                color: state.status === 'completed' ? '#fff' : 'var(--text-muted)',
              }}>{tab.mono}</span>
              {tab.label}
              {isActive && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 1.5, backgroundColor: 'var(--text-primary)', borderRadius: 1 }} />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ minHeight: 300, maxWidth: 800 }}>
        {renderContent()}
      </div>
    </div>
  );
}
