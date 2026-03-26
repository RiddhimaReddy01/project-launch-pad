import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { useIdea, type AnalyzeFinding } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AnalyzeContext, SectionKey, OpportunityData, CustomersData, CompetitorsData, RootCauseData, CostsData, RiskData, LocationData, MoatData, SectionData } from '@/lib/analyze';
import { analyzeSectionsParallel } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';
import ModuleRail, { type ModuleInfo } from './ModuleRail';

const OpportunitySizing = lazy(() => import('./OpportunitySizing'));
const CustomerSegments = lazy(() => import('./CustomerSegments'));
const Competitors = lazy(() => import('./Competitors'));
const RootCauses = lazy(() => import('./RootCauses'));
const StartupCostsPreview = lazy(() => import('./StartupCostsPreview'));
const RiskMatrix = lazy(() => import('./RiskMatrix'));
const LocationIntel = lazy(() => import('./LocationIntel'));
const CompetitiveMoat = lazy(() => import('./CompetitiveMoat'));

const MODULE_DEFS: { key: SectionKey; label: string; mono: string; subtitle: string }[] = [
  { key: 'opportunity', label: 'Opportunity', mono: 'O', subtitle: 'TAM / SAM / SOM sizing' },
  { key: 'customers', label: 'Customers', mono: 'C', subtitle: 'Segment analysis' },
  { key: 'competitors', label: 'Competitors', mono: 'X', subtitle: 'Landscape & gaps' },
  { key: 'rootcause', label: 'Root Cause', mono: 'R', subtitle: 'Strategic friction' },
  { key: 'costs', label: 'Costs', mono: '$', subtitle: 'Launch budget' },
  { key: 'risk', label: 'Risk', mono: 'K', subtitle: 'Risk assessment' },
  { key: 'location', label: 'Location', mono: 'L', subtitle: 'Location intelligence' },
  { key: 'moat', label: 'Moat', mono: 'M', subtitle: 'Competitive defensibility' },
];

interface InputSelection {
  business_type: boolean;
  location: boolean;
  target_customers: boolean;
  selected_insight: boolean;
  discover_insights: boolean;
  customer_evidence: boolean;
  prior_sections: Set<SectionKey>;
}

const DEFAULT_INPUTS: InputSelection = {
  business_type: true,
  location: true,
  target_customers: true,
  selected_insight: true,
  discover_insights: true,
  customer_evidence: true,
  prior_sections: new Set(),
};

interface SectionState {
  data: SectionData | null;
  status: 'idle' | 'loading' | 'completed' | 'error' | 'stale';
  error?: string;
  lastRun?: string;
  inputsUsed?: InputSelection;
}

type SectionResults = Record<SectionKey, SectionState>;

const initSections = (prefetchedData?: Record<string, any>): SectionResults => {
  const r: any = {};
  MODULE_DEFS.forEach(m => {
    const prefetched = prefetchedData?.[m.key];
    if (prefetched) {
      r[m.key] = { data: prefetched, status: 'completed', lastRun: 'prefetched' };
    } else {
      r[m.key] = { data: null, status: 'idle' };
    }
  });
  return r as SectionResults;
};

export default function AnalyzeModule() {
  const { idea, selectedInsight, decomposeResult, discoverResult, setAnalyzeFindings, setAnalyzeData, analyzeData } = useIdea();
  const { user } = useAuth();

  const [activeModule, setActiveModule] = useState<SectionKey>('opportunity');
  const [sections, setSections] = useState<SectionResults>(() => initSections(analyzeData));
  const [inputs] = useState<InputSelection>({ ...DEFAULT_INPUTS });
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build context from inputs
  const context: AnalyzeContext | null = useMemo(() => {
    if (!decomposeResult) return null;
    const ctx: AnalyzeContext = {
      business_type: inputs.business_type ? decomposeResult.stage1.business_type : '',
      city: inputs.location ? decomposeResult.stage1.location.city : '',
      state: inputs.location ? decomposeResult.stage1.location.state : '',
    };
    if (inputs.target_customers && decomposeResult.stage2?.target_customers) {
      ctx.target_customers = decomposeResult.stage2.target_customers;
    }
    if (inputs.selected_insight && selectedInsight) {
      ctx.insight_title = selectedInsight;
    }
    if (inputs.discover_insights && discoverResult?.insights) {
      ctx.insight_evidence = discoverResult.insights
        .slice(0, 5)
        .map(i => `${i.title}: ${i.description}`)
        .join('\n');
    }
    if (inputs.customer_evidence && discoverResult?.insights) {
      const evidence = discoverResult.insights
        .flatMap(i => (i as any).mentions || [])
        .slice(0, 10)
        .map((m: any) => m.quote || m.text || '')
        .filter(Boolean)
        .join('\n');
      if (evidence) ctx.insight_evidence = (ctx.insight_evidence || '') + '\n' + evidence;
    }
    ctx.price_tier = decomposeResult.stage2?.price_tier;
    return ctx;
  }, [decomposeResult, selectedInsight, discoverResult, inputs]);

  // Sync findings
  useEffect(() => {
    const findings: AnalyzeFinding[] = Array.from(selectedFindings).map((text, i) => {
      const section = text.startsWith('SOM') || text.startsWith('TAM') ? 'opportunity'
        : text.startsWith('Segment') ? 'customers'
        : text.startsWith('Gap') ? 'competitors'
        : text.startsWith('Quick win') ? 'rootcause'
        : 'general';
      return { id: `finding-${i}`, text, section, type: section };
    });
    setAnalyzeFindings(findings);
  }, [selectedFindings, setAnalyzeFindings]);

  // Pick up prefetched analyze data that arrives after mount
  useEffect(() => {
    if (!analyzeData || Object.keys(analyzeData).length === 0) return;
    setSections(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(analyzeData).forEach(([k, v]) => {
        if (v && next[k as SectionKey]?.status === 'idle') {
          next[k as SectionKey] = { data: v, status: 'completed', lastRun: 'prefetched' };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [analyzeData]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Responsive collapse
  useEffect(() => {
    const w = window.innerWidth;
    if (w < 900) { setRailCollapsed(true); }
  }, []);

  const handleSectionData = useCallback((section: SectionKey, data: SectionData) => {
    setSections(prev => {
      const next = {
        ...prev,
        [section]: {
          data,
          status: 'completed' as const,
          lastRun: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inputsUsed: { ...inputs, prior_sections: new Set(inputs.prior_sections) },
        },
      };
      // Push completed data to shared context for Validate tab
      const shared: Record<string, any> = {};
      Object.entries(next).forEach(([k, v]) => { if (v.data) shared[k] = v.data; });
      setAnalyzeData(shared);
      return next;
    });
  }, [inputs, setAnalyzeData]);

  const handleSectionError = useCallback((section: SectionKey, error: string) => {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], status: 'error', error },
    }));
  }, []);

  const handleSelectModule = (key: SectionKey) => {
    setActiveModule(key);
  };


  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save analysis'); return; }
    try {
      const sectionData: any = {};
      Object.entries(sections).forEach(([k, v]) => { if (v.data) sectionData[k] = v.data; });

      const payload = {
        sections: sectionData,
        selected_findings: Array.from(selectedFindings),
        saved_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('idea_text', idea)
        .maybeSingle();

      if (existing) {
        await supabase.from('saved_ideas').update({ analysis_data: payload as any }).eq('id', existing.id);
      } else {
        await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, analysis_data: payload as any });
      }
      toast.success('Analysis saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    const sectionData: any = {};
    Object.entries(sections).forEach(([k, v]) => { if (v.data) sectionData[k] = v.data; });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(generatePrintHTML(context, sectionData, Array.from(selectedFindings), idea));
      printWin.document.close();
      setTimeout(() => { printWin.print(); setExporting(false); }, 500);
    } else {
      setExporting(false);
    }
  }, [context, sections, selectedFindings, idea]);

  // Module info for rail
  const moduleInfos: ModuleInfo[] = MODULE_DEFS.map(m => ({
    ...m,
    status: sections[m.key].status,
    lastRun: sections[m.key].lastRun,
  }));

  const completedSections = new Set(
    Object.entries(sections).filter(([, v]) => v.status === 'completed').map(([k]) => k as SectionKey)
  );
  const completedCount = completedSections.size;

  const activeSec = sections[activeModule];
  const shouldRun = activeSec.status === 'idle' || activeSec.status === 'loading';

  // Section-specific key findings
  const [savingFinding, setSavingFinding] = useState<string | null>(null);

  const getSectionFindings = (sectionKey: SectionKey): { id: string; text: string; section: string }[] => {
    const findings: { id: string; text: string; section: string }[] = [];
    const sec = sections[sectionKey];
    if (!sec.data) return findings;

    switch (sectionKey) {
      case 'opportunity': {
        const d = sec.data as OpportunityData;
        findings.push({ id: 'opp-som', text: `SOM: ${d.som.formatted} (${d.som.confidence} confidence)`, section: 'opportunity' });
        findings.push({ id: 'opp-tam', text: `TAM: ${d.tam.formatted}`, section: 'opportunity' });
        findings.push({ id: 'opp-sam', text: `SAM: ${d.sam.formatted}`, section: 'opportunity' });
        if (d.funnel.repeat_customers) findings.push({ id: 'opp-repeat', text: `Estimated repeat customers: ${d.funnel.repeat_customers.toLocaleString()}`, section: 'opportunity' });
        break;
      }
      case 'customers': {
        const d = sec.data as CustomersData;
        d.segments?.forEach((s, i) => findings.push({ id: `cust-${i}`, text: `${s.name} — Pain ${s.pain_intensity}/10, ~${s.estimated_size.toLocaleString()} people`, section: 'customers' }));
        break;
      }
      case 'competitors': {
        const d = sec.data as CompetitorsData;
        d.unfilled_gaps?.forEach((g, i) => findings.push({ id: `gap-${i}`, text: g, section: 'competitors' }));
        d.competitors?.filter(c => c.threat_level === 'high').forEach((c, i) => findings.push({ id: `threat-${i}`, text: `High threat: ${c.name} — ${c.key_gap}`, section: 'competitors' }));
        break;
      }
      case 'rootcause': {
        const d = sec.data as RootCauseData;
        d.root_causes?.forEach((c, i) => findings.push({ id: `rc-${i}`, text: `${c.title}: ${c.your_move.slice(0, 120)}`, section: 'rootcause' }));
        break;
      }
      case 'costs': {
        const d = sec.data as CostsData;
        findings.push({ id: 'cost-range', text: `Launch cost: $${(d.total_range.min / 1000).toFixed(0)}K – $${(d.total_range.max / 1000).toFixed(0)}K`, section: 'costs' });
        if (d.note) findings.push({ id: 'cost-driver', text: `Key driver: ${d.note}`, section: 'costs' });
        break;
      }
      case 'risk': {
        const d = sec.data as RiskData;
        findings.push({ id: 'risk-overall', text: `Overall risk: ${d.overall_risk_level} — ${d.summary}`, section: 'risk' });
        d.risks?.filter(r => r.likelihood === 'high' || r.impact === 'high').forEach((r, i) => findings.push({ id: `risk-${i}`, text: `${r.risk}: ${r.mitigation.slice(0, 100)}`, section: 'risk' }));
        break;
      }
      case 'location': {
        const d = sec.data as LocationData;
        findings.push({ id: 'loc-score', text: `Location score: ${d.score}/10 — ${d.verdict}`, section: 'location' });
        break;
      }
      case 'moat': {
        const d = sec.data as MoatData;
        findings.push({ id: 'moat-score', text: `Moat score: ${d.overall_score}/10`, section: 'moat' });
        findings.push({ id: 'moat-strong', text: `Strongest: ${d.strongest}`, section: 'moat' });
        findings.push({ id: 'moat-weak', text: `Weakest: ${d.weakest}`, section: 'moat' });
        break;
      }
    }
    return findings;
  };

  const activeFindings = getSectionFindings(activeModule);
  const activeSynthesis = activeModule === 'opportunity'
    ? (activeSec.data as OpportunityData | null)?.synthesis
    : null;

  const handleSaveFinding = async (finding: { id: string; text: string; section: string }) => {
    if (!user) { toast.error('Sign in to save findings'); return; }
    setSavingFinding(finding.id);
    try {
      const next = new Set(selectedFindings);
      if (next.has(finding.text)) { next.delete(finding.text); } else { next.add(finding.text); }
      setSelectedFindings(next);

      const allFindings = Array.from(next).map(text => {
        const matchSection = activeFindings.find(af => af.text === text)?.section || activeModule;
        return { text, section: matchSection };
      });

      const sectionData: any = {};
      Object.entries(sections).forEach(([k, v]) => { if (v.data) sectionData[k] = v.data; });
      const payload = { sections: sectionData, selected_findings: allFindings, saved_at: new Date().toISOString() };

      const { data: existing } = await supabase
        .from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();

      if (existing) {
        await supabase.from('saved_ideas').update({ analysis_data: payload as any }).eq('id', existing.id);
      } else {
        await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, analysis_data: payload as any, current_step: 'analyze' });
      }
      toast.success(next.has(finding.text) ? 'Finding saved' : 'Finding removed');
    } catch { toast.error('Failed to save'); }
    finally { setSavingFinding(null); }
  };

  if (!decomposeResult) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 400 }}>
        <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Pick a module and run your analysis</p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Choose which signals and insights to include, then run only the analyses you need.
        </p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="scroll-reveal flex" style={{ minHeight: 'calc(100vh - 240px)', margin: '0 -24px' }}>
      {/* Left: Module Rail */}
      <ModuleRail
        modules={moduleInfos}
        activeModule={activeModule}
        onSelect={handleSelectModule}
        collapsed={railCollapsed}
        onToggle={() => setRailCollapsed(!railCollapsed)}
        completedCount={completedCount}
      />

      {/* Center: Output Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-3">
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              fontSize: 12, fontWeight: 700,
              backgroundColor: 'var(--accent-primary)', color: '#080810',
            }}>
              {MODULE_DEFS.find(m => m.key === activeModule)?.mono}
            </span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {MODULE_DEFS.find(m => m.key === activeModule)?.label}
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                {MODULE_DEFS.find(m => m.key === activeModule)?.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Run All — parallel */}
            {completedCount < MODULE_DEFS.length && idea && (
              <button
                onClick={async () => {
                  const remaining = MODULE_DEFS.filter(m => sections[m.key].status !== 'completed').map(m => m.key);
                  if (remaining.length === 0) return;
                  // Mark all as loading
                  setSections(prev => {
                    const next = { ...prev };
                    remaining.forEach(k => { next[k] = { ...next[k], status: 'loading', error: undefined }; });
                    return next;
                  });
                  // Run in parallel
                  const results = await analyzeSectionsParallel(remaining, idea);
                  setSections(prev => {
                    const next = { ...prev };
                    Object.entries(results).forEach(([k, v]) => {
                      if (v.data) {
                        next[k as SectionKey] = { data: v.data, status: 'completed', lastRun: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), inputsUsed: { ...inputs, prior_sections: new Set(inputs.prior_sections) } };
                      } else {
                        next[k as SectionKey] = { ...next[k as SectionKey], status: 'error', error: v.error };
                      }
                    });
                    // Update shared context
                    const shared: Record<string, any> = {};
                    Object.entries(next).forEach(([k, v]) => { if (v.data) shared[k] = v.data; });
                    setAnalyzeData(shared);
                    return next;
                  });
                  toast.success('All sections researched');
                }}
                className="btn-primary rounded-lg px-4 py-1.5"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                Run all sections
              </button>
            )}
            {completedCount > 0 && (
              <>
                <button onClick={handleSave} className="btn-primary rounded-lg px-4 py-1.5" style={{ fontSize: 12, fontWeight: 600 }}>
                  Save
                </button>
                <button onClick={handleExportPDF} disabled={exporting} className="btn-secondary rounded-lg px-4 py-1.5" style={{ fontSize: 12, fontWeight: 600 }}>
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </button>
              </>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              {completedCount}/{MODULE_DEFS.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-8" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
          {activeSynthesis && activeSec.status === 'completed' && (
            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="rounded-[14px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
                <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>FINAL VERDICT</p>
                <p className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
                  {activeSynthesis.final_verdict.toUpperCase()}
                </p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {activeSynthesis.summary}
                </p>
              </div>

              <div className="rounded-[14px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
                <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>OPPORTUNITY SCORE</p>
                <p className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
                  {activeSynthesis.opportunity_score} / 100
                </p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Confidence: {activeSynthesis.confidence}
                </p>
              </div>

              <div className="rounded-[14px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
                <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>TOP DRIVERS</p>
                <div className="flex flex-col gap-2">
                  {activeSynthesis.top_drivers.slice(0, 3).map((driver, index) => (
                    <p key={index} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {index + 1}. {driver}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module output */}
          {activeSec.status === 'idle' && (
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
              <p className="font-heading" style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                Ready to research
              </p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6, marginBottom: 20 }}>
                Run this section when you want a focused answer for this part of the idea.
              </p>
              <button
                onClick={() => {
                  setSections(prev => ({ ...prev, [activeModule]: { ...prev[activeModule], status: 'loading' } }));
                }}
                className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Run {MODULE_DEFS.find(m => m.key === activeModule)?.label}
              </button>
            </div>
          )}

          {activeSec.status === 'error' && (
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>
                This section couldn't load right now.
              </p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>
                {activeSec.error || 'Give it another shot — sometimes a retry does the trick.'}
              </p>
              <button
                onClick={() => setSections(prev => ({ ...prev, [activeModule]: { ...prev[activeModule], status: 'loading', error: undefined } }))}
                className="rounded-[10px] px-5 py-2.5 transition-all duration-200"
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {(activeSec.status === 'loading' || activeSec.status === 'completed' || activeSec.status === 'stale') && context && (
            <Suspense fallback={<SectionSkeleton />}>
              {activeModule === 'opportunity' && <OpportunitySizing context={context} onData={(d) => handleSectionData('opportunity', d)} onError={(e) => handleSectionError('opportunity', e)} shouldRun={sections.opportunity.status === 'loading'} initialData={sections.opportunity.data as any} />}
              {activeModule === 'customers' && <CustomerSegments context={context} onData={(d) => handleSectionData('customers', d)} onError={(e) => handleSectionError('customers', e)} shouldRun={sections.customers.status === 'loading'} initialData={sections.customers.data as any} />}
              {activeModule === 'competitors' && <Competitors context={context} onData={(d) => handleSectionData('competitors', d)} onError={(e) => handleSectionError('competitors', e)} shouldRun={sections.competitors.status === 'loading'} initialData={sections.competitors.data as any} />}
              {activeModule === 'rootcause' && <RootCauses context={context} onData={(d) => handleSectionData('rootcause', d)} onError={(e) => handleSectionError('rootcause', e)} shouldRun={sections.rootcause.status === 'loading'} initialData={sections.rootcause.data as any} />}
              {activeModule === 'costs' && <StartupCostsPreview context={context} onData={(d) => handleSectionData('costs', d)} onError={(e) => handleSectionError('costs', e)} shouldRun={sections.costs.status === 'loading'} initialData={sections.costs.data as any} />}
              {activeModule === 'risk' && <RiskMatrix context={context} onData={(d) => handleSectionData('risk', d)} onError={(e) => handleSectionError('risk', e)} shouldRun={sections.risk.status === 'loading'} initialData={sections.risk.data as any} />}
              {activeModule === 'location' && <LocationIntel context={context} onData={(d) => handleSectionData('location', d)} onError={(e) => handleSectionError('location', e)} shouldRun={sections.location.status === 'loading'} initialData={sections.location.data as any} />}
              {activeModule === 'moat' && <CompetitiveMoat context={context} onData={(d) => handleSectionData('moat', d)} onError={(e) => handleSectionError('moat', e)} shouldRun={sections.moat.status === 'loading'} initialData={sections.moat.data as any} />}
            </Suspense>
          )}

          {/* Section-specific key findings */}
          {activeFindings.length > 0 && activeSec.status === 'completed' && (
            <div className="mt-12 rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Key findings — {MODULE_DEFS.find(m => m.key === activeModule)?.label}
                </p>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>
                  {Array.from(selectedFindings).filter(f => activeFindings.some(af => af.text === f)).length} saved
                </span>
              </div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>
                Save findings to your dashboard for validation
              </p>
              <div className="flex flex-col gap-1.5">
                {activeFindings.map((finding) => {
                  const isSelected = selectedFindings.has(finding.text);
                  const isSaving = savingFinding === finding.id;
                  return (
                    <div key={finding.id} className="flex items-start gap-3 rounded-[8px] p-3 transition-colors duration-150" style={{ backgroundColor: isSelected ? 'rgba(45,139,117,0.03)' : 'transparent' }}>
                      <span className="flex-1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: isSelected ? 400 : 300, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {finding.text}
                      </span>
                      <button
                        onClick={() => handleSaveFinding(finding)}
                        disabled={isSaving}
                        className="rounded-[6px] px-3 py-1 transition-all duration-200 flex-shrink-0"
                        style={{
                          fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 400,
                          backgroundColor: isSelected ? 'var(--text-primary)' : 'transparent',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          border: isSelected ? 'none' : '1px solid var(--divider)',
                          cursor: isSaving ? 'wait' : 'pointer',
                          opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {isSaving ? '...' : isSelected ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function generatePrintHTML(context: AnalyzeContext | null, sections: any, findings: string[], idea: string): string {
  if (!context) return '<html><body><p>No data</p></body></html>';
  const sectionHTML = Object.entries(sections).map(([key, data]) => {
    return `<div style="margin-bottom:32px;page-break-inside:avoid">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:12px;text-transform:capitalize;border-bottom:1px solid #e5e5e5;padding-bottom:8px">${key.replace('rootcause', 'Root Cause')}</h2>
      <pre style="font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:Inter,sans-serif;color:#444">${JSON.stringify(data, null, 2)}</pre>
    </div>`;
  }).join('');
  const findingsHTML = findings.length ? `
    <div style="margin-top:32px;border-top:2px solid #1a1a1a;padding-top:16px">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:12px">Key Findings</h2>
      <ul style="font-size:13px;line-height:1.8;color:#444">${findings.map(f => `<li>${f}</li>`).join('')}</ul>
    </div>` : '';
  return `<!DOCTYPE html><html><head>
    <title>Launch Lean Analysis — ${context.business_type}</title>
    <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}h1{font-size:24px;font-weight:400;margin-bottom:4px}.meta{font-size:13px;color:#999;margin-bottom:32px}@media print{body{margin:20px}}</style>
  </head><body>
    <h1>${context.business_type}</h1>
    <p class="meta">${context.city}, ${context.state} — Generated ${new Date().toLocaleDateString()}</p>
    ${sectionHTML}${findingsHTML}
  </body></html>`;
}
