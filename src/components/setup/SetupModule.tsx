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
  { key: 'costs' as const, label: 'Costs', mono: '$', subtitle: 'Launch budget by tier', icon: '💰' },
  { key: 'suppliers' as const, label: 'Suppliers', mono: 'S', subtitle: 'Tier-appropriate vendors', icon: '🏪' },
  { key: 'team' as const, label: 'Team', mono: 'T', subtitle: 'Year 1 hiring plan', icon: '👥' },
  { key: 'timeline' as const, label: 'Timeline', mono: 'R', subtitle: '4-phase roadmap', icon: '📅' },
];

type TabKey = typeof TABS[number]['key'];

const TAB_QUESTIONS: Record<TabKey, string> = {
  costs: 'What is the most realistic launch scope for this idea right now?',
  suppliers: 'Which vendors deserve trust and budget early on?',
  team: 'Who actually needs to be involved in year one, and when?',
  timeline: 'What is the right sequence from validation to launch?',
};

function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not available';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

interface SectionState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'completed' | 'error';
  error?: string;
}

export default function SetupModule() {
  const { idea, decomposeResult, setSetupData, setupData: prefetchedSetup } = useIdea();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedTier, setSelectedTier] = useState<TierId>('mid');
  const [activeTab, setActiveTab] = useState<TabKey>('costs');
  const [exporting, setExporting] = useState(false);

  // Initialize from prefetched data if available
  const prefetchedCosts = prefetchedSetup?.costs as CostsResult | undefined;
  const [costsState, setCostsState] = useState<SectionState<CostsResult>>({
    data: prefetchedCosts || null,
    status: prefetchedCosts ? 'completed' : 'idle',
  });
  const [suppliersState, setSuppliersState] = useState<SectionState<SuppliersResult>>({ data: null, status: 'idle' });
  const [teamState, setTeamState] = useState<SectionState<TeamResult>>({ data: null, status: 'idle' });
  const [timelineState, setTimelineState] = useState<SectionState<TimelineResult>>({ data: null, status: 'idle' });

  // Pick up prefetched costs if they arrive after mount
  useEffect(() => {
    if (prefetchedCosts && costsState.status === 'idle') {
      setCostsState({ data: prefetchedCosts, status: 'completed' });
    }
  }, [prefetchedCosts]);

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
    if (!idea) return;
    const setters = { costs: setCostsState, suppliers: setSuppliersState, team: setTeamState, timeline: setTimelineState };
    setters[section]({ data: null, status: 'loading' });
    try {
      const result = await setupSection(section, idea, selectedTier.toUpperCase());
      // Treat empty arrays as failures
      const isEmpty = (section === 'suppliers' && (!(result as any).suppliers?.length)) ||
                      (section === 'team' && (!(result as any).team?.length));
      if (isEmpty) {
        setters[section]({ data: null, status: 'error', error: 'No data returned — try again or switch tiers' });
        return;
      }
      setters[section]({ data: result as any, status: 'completed' });
      setSetupData(prev => ({ ...prev, tier: selectedTier, [section]: result }));
    } catch (err: any) {
      setters[section]({ data: null, status: 'error', error: err.message });
    }
  }, [idea, selectedTier, setSetupData]);

  // Auto-load costs on mount
  useEffect(() => {
    if (idea && costsState.status === 'idle') loadSection('costs');
  }, [idea]);

  // Load tab data on switch
  useEffect(() => {
    if (!idea) return;
    const states = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState };
    if (states[activeTab].status === 'idle') loadSection(activeTab);
  }, [activeTab, idea]);

  // Re-fetch suppliers/team/timeline when tier changes
  useEffect(() => {
    if (!idea) return;
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

    let html = `<!DOCTYPE html><html><head><title>Launch Lean Setup — ${biz}</title>
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
        <p className="font-heading" style={{ marginBottom: 8 }}>Start with your idea first</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Enter your business idea on the home page so we can build your launch plan.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    const state = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState }[activeTab];

    if (state.status === 'loading') return <SectionSkeleton label={`Researching ${activeTab === 'costs' ? 'launch costs' : activeTab === 'suppliers' ? 'vendors' : activeTab === 'team' ? 'hiring options' : 'your roadmap'} for the ${selectedTier} strategy...`} />;
    if (state.status === 'error') return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>We couldn't load this section right now.</p>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 16 }}>{state.error || 'Give it another shot'}</p>
        <button onClick={() => loadSection(activeTab)} className="rounded-[10px] px-5 py-2.5"
          style={{ fontSize: 13, fontWeight: 600, backgroundColor: 'var(--color-accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
    if (state.status === 'idle') return <SectionSkeleton label="Getting ready..." />;

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
          <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>SETUP</p>
          <p className="font-heading" style={{ marginBottom: 8 }}>Launch Plan</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 700 }}>
            Your costs, vendors, team plan, and roadmap — tailored to the {selectedTier} launch strategy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Completion ring */}
          <div style={{ position: 'relative', width: 48, height: 48 }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--divider)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-accent)" strokeWidth="3"
                strokeDasharray={`${(completedCount / 4) * 125.6} 125.6`}
                strokeLinecap="round" transform="rotate(-90 24 24)"
                style={{ transition: 'stroke-dasharray 600ms ease-out' }} />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {completedCount}/4
            </span>
          </div>
          {completedCount > 0 && (
            <>
              <button onClick={handleSave} className="btn-primary rounded-lg px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>Save</button>
              <button onClick={handleExportPDF} disabled={exporting} className="btn-secondary rounded-lg px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tier selector */}
      <div className="mb-10">
        <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>SELECT LAUNCH STRATEGY</p>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {(['lean', 'mid', 'premium'] as const).map((tier) => {
            const isSelected = selectedTier === tier;
            const tierData = costsState.data?.tiers?.find(t => t.id === tier);
            const labels = {
              lean: { title: 'Lean', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$30–50K', weeks: tierData?.timeline_weeks || 16, team: tierData?.team_size || '1', best: tierData?.best_for || 'MVPs, services' },
              mid: { title: 'Balanced', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$75–100K', weeks: tierData?.timeline_weeks || 24, team: tierData?.team_size || '1–2', best: tierData?.best_for || 'Most startups' },
              premium: { title: 'Premium', cost: tierData ? `$${(tierData.cost_min/1000).toFixed(0)}K–$${(tierData.cost_max/1000).toFixed(0)}K` : '$150–200K', weeks: tierData?.timeline_weeks || 32, team: tierData?.team_size || '2–3+', best: tierData?.best_for || 'Complex products' },
            }[tier];

            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className="text-left rounded-xl p-5 transition-all duration-200 active:scale-[0.97]"
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent-soft)' : 'var(--surface-card)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--divider)',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 700,
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--surface-elevated)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                  }}>

                    {TIER_MONOS[tier]}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {labels.title}
                  </span>
                </div>
                <p className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{labels.cost}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  {labels.team} people · {labels.weeks} weeks
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                  {labels.best}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {costsState.data?.recommendation && (
        <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: '1.15fr repeat(2, minmax(220px, 1fr))' }}>
          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>RECOMMENDED TIER</p>
            <p className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
              {costsState.data.recommendation.recommended_tier}
            </p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
              {costsState.data.recommendation.rationale}
            </p>
            {!!costsState.data.recommendation.not_recommended?.length && (
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
                Not recommended right now: {costsState.data.recommendation.not_recommended.join(', ')}
              </p>
            )}
          </div>

          {costsState.data.revenue_projection && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>REVENUE OUTLOOK</p>
              <p className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
                {formatCurrency(costsState.data.revenue_projection.expected_monthly_revenue)}/mo
              </p>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                Break-even: {costsState.data.revenue_projection.breakeven_label}
              </p>
              {!!costsState.data.revenue_projection.assumptions?.length && (
                <div className="flex flex-col gap-2" style={{ marginTop: 14 }}>
                  {costsState.data.revenue_projection.assumptions.slice(0, 3).map((assumption, index) => (
                    <p key={index} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                      {assumption}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {costsState.data.founder_time_allocation?.length ? (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>FOUNDER TIME</p>
              <div className="flex flex-col gap-2">
                {costsState.data.founder_time_allocation.slice(0, 3).map((item) => (
                  <div key={item.area}>
                    <div className="flex items-center justify-between" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span>{item.area}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.percent}%</span>
                    </div>
                    {item.why_now && (
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 6, marginBottom: 0 }}>
                        {item.why_now}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!!costsState.data.vendor_benchmarks?.length && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', gridColumn: '1 / -1' }}>
              <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>VENDOR BENCHMARKS</p>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {costsState.data.vendor_benchmarks.slice(0, 4).map((vendor) => (
                  <div key={`${vendor.vendor}-${vendor.category}`} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--divider-subtle)' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{vendor.vendor}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{vendor.category}</p>
                    {vendor.benchmark_cost_range && (
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {formatCurrency(vendor.benchmark_cost_range.min)} - {formatCurrency(vendor.benchmark_cost_range.max)}
                      </p>
                    )}
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                      {vendor.why_recommended}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>QUESTION THIS SECTION ANSWERS</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {TAB_QUESTIONS[activeTab]}
        </p>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
          The tabs below should read like one operating recommendation, not separate utilities.
        </p>
      </div>

      {/* Tab navigation — visual cards */}
      <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const state = { costs: costsState, suppliers: suppliersState, team: teamState, timeline: timelineState }[tab.key];
          const isCompleted = state.status === 'completed';
          const isLoading = state.status === 'loading';
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="text-left rounded-xl p-4 transition-all duration-200 active:scale-[0.97]"
              style={{
                backgroundColor: isActive ? 'var(--color-accent-soft)' : 'var(--surface-card)',
                border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--divider)',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 16px rgba(255,56,92,0.12)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}>
              {isLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }}>
                  <div className="animate-pulse" style={{ height: '100%', width: '60%', backgroundColor: 'var(--color-accent)', borderRadius: 2 }} />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                {isCompleted && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto' }}>
                    <circle cx="7" cy="7" r="6.5" fill="var(--color-accent)" />
                    <path d="M4.5 7L6.5 9L9.5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{tab.label}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>{tab.subtitle}</p>
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
