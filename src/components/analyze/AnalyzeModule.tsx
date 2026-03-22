import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useIdea, type AnalyzeFinding } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AnalyzeContext, OpportunityData, CustomersData, CompetitorsData, RootCauseData, CostsData, RiskData, LocationData, MoatData } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

const OpportunitySizing = lazy(() => import('./OpportunitySizing'));
const CustomerSegments = lazy(() => import('./CustomerSegments'));
const Competitors = lazy(() => import('./Competitors'));
const RootCauses = lazy(() => import('./RootCauses'));
const StartupCostsPreview = lazy(() => import('./StartupCostsPreview'));
const RiskMatrix = lazy(() => import('./RiskMatrix'));
const LocationIntel = lazy(() => import('./LocationIntel'));
const CompetitiveMoat = lazy(() => import('./CompetitiveMoat'));

const TABS = [
  { key: 'opportunity', label: 'Opportunity', mono: 'O', question: 'Is the market big enough?', autoLoad: true },
  { key: 'customers', label: 'Customers', mono: 'C', question: 'Who exactly to target?', autoLoad: true },
  { key: 'competitors', label: 'Competitors', mono: 'X', question: 'Where can you win?', autoLoad: true },
  { key: 'rootcause', label: 'Root Cause', mono: 'R', question: "Why hasn't this been solved?", autoLoad: false },
  { key: 'costs', label: 'Costs', mono: '$', question: 'What will it cost to start?', autoLoad: false },
  { key: 'risk', label: 'Risk', mono: 'K', question: 'What could go wrong?', autoLoad: false },
  { key: 'location', label: 'Location', mono: 'L', question: 'Is this the right place?', autoLoad: false },
  { key: 'moat', label: 'Moat', mono: 'M', question: 'Can you defend this position?', autoLoad: false },
] as const;

type TabKey = typeof TABS[number]['key'];

interface SectionResults {
  opportunity?: OpportunityData;
  customers?: CustomersData;
  competitors?: CompetitorsData;
  rootcause?: RootCauseData;
  costs?: CostsData;
  risk?: RiskData;
  location?: LocationData;
  moat?: MoatData;
}

export default function AnalyzeModule() {
  const { idea, selectedInsight, decomposeResult, discoverResult, setAnalyzeFindings } = useIdea();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('opportunity');
  const [activated, setActivated] = useState<Set<TabKey>>(new Set());
  const [sectionResults, setSectionResults] = useState<SectionResults>({});
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (context) {
      const autoTabs = TABS.filter(t => t.autoLoad).map(t => t.key);
      setActivated(new Set(autoTabs));
    }
  }, [context?.business_type]);

  // Sync findings to context whenever selection changes
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

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-analysis-pdf', {
        body: {
          context,
          sections: sectionResults,
          findings: Array.from(selectedFindings),
          idea,
        },
      });
      if (error) throw error;
      
      // The edge function returns HTML — open in new tab for printing
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => { w.print(); };
      }
      toast.success('PDF export opened — use your browser print dialog');
    } catch {
      // Fallback: generate a simple print view client-side
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(generatePrintHTML(context, sectionResults, Array.from(selectedFindings), idea));
        printWin.document.close();
        setTimeout(() => printWin.print(), 500);
      }
      toast.success('Export opened in new tab');
    } finally {
      setExporting(false);
    }
  }, [context, sectionResults, selectedFindings, idea]);

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
    keyFindings.push(`TAM: ${sectionResults.opportunity.tam.formatted}`);
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
  if (sectionResults.moat) {
    keyFindings.push(`Moat score: ${sectionResults.moat.overall_score}/10 — Strongest: ${sectionResults.moat.strongest}`);
  }
  if (sectionResults.risk) {
    keyFindings.push(`Risk level: ${sectionResults.risk.overall_risk_level} — ${sectionResults.risk.summary}`);
  }

  const completedCount = Object.keys(sectionResults).length;

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Sticky context bar */}
      <div className="sticky z-30 rounded-[12px] mb-8 p-4" style={{ top: 80, backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid var(--divider)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Analyzing</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
              {context.business_type} — {context.city}, {context.state}
            </p>
          </div>
          {selectedInsight && (
            <div style={{ maxWidth: 280 }}>
              <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Insight</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--accent-purple)' }}>{selectedInsight}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {TABS.map(t => (
                <div key={t.key} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: sectionResults[t.key] ? 'var(--accent-teal)' : activated.has(t.key) ? 'var(--accent-amber)' : 'var(--divider-light)',
                }} />
              ))}
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{completedCount}/{TABS.length}</span>
          </div>
        </div>
      </div>

      {/* Section tabs — monogram style */}
      <div className="flex flex-nowrap gap-0 mb-8 overflow-x-auto hide-scrollbar" style={{ borderBottom: '1px solid var(--divider)' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isLoaded = !!sectionResults[tab.key];
          const isActivated = activated.has(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className="transition-all duration-200 flex-shrink-0 flex items-center gap-2"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: isActive ? 400 : 300,
                letterSpacing: '0.02em',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
                padding: '10px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
                fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                backgroundColor: isLoaded ? 'var(--accent-teal)' : isActive ? 'var(--text-primary)' : 'var(--divider-light)',
                color: isLoaded || isActive ? '#fff' : 'var(--text-muted)',
                transition: 'all 200ms ease-out',
              }}>
                {tab.mono}
              </span>
              {tab.label}
              {isActivated && !isLoaded && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--accent-amber)', display: 'inline-block' }} className="animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Section question */}
      <p className="font-heading mb-6" style={{ fontSize: 22, opacity: 0.35 }}>
        {TABS.find(t => t.key === activeTab)?.question}
      </p>

      {/* Section content */}
      <div style={{ minHeight: 300 }}>
        {!activated.has(activeTab) ? (
          <div className="text-center py-16">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>
              This section loads on demand
            </p>
            <button
              onClick={() => handleTabClick(activeTab)}
              className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
              style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
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
            {activeTab === 'risk' && <RiskMatrix context={context} onData={(d) => handleSectionData('risk', d)} />}
            {activeTab === 'location' && <LocationIntel context={context} onData={(d) => handleSectionData('location', d)} />}
            {activeTab === 'moat' && <CompetitiveMoat context={context} onData={(d) => handleSectionData('moat', d)} />}
          </Suspense>
        )}
      </div>

      {/* Key findings selection */}
      {keyFindings.length > 0 && (
        <div className="mt-12 rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Select key findings to carry forward</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>
            Selected findings will be saved and passed to the Validate tab for testing
          </p>
          <div className="flex flex-col gap-1.5">
            {keyFindings.map((finding, i) => {
              const isSelected = selectedFindings.has(finding);
              return (
                <label
                  key={i}
                  className="flex items-start gap-3 rounded-[8px] p-3 cursor-pointer transition-colors duration-150"
                  style={{ backgroundColor: isSelected ? 'rgba(26,26,26,0.02)' : 'transparent' }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, marginTop: 1, flexShrink: 0,
                    border: isSelected ? 'none' : '1.5px solid var(--divider-section)',
                    backgroundColor: isSelected ? 'var(--text-primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms ease-out', cursor: 'pointer',
                  }}>
                    {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleFinding(finding)} className="sr-only" />
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
          className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Save analysis
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--divider-light)', cursor: 'pointer', opacity: exporting ? 0.5 : 1 }}
        >
          {exporting ? 'Generating...' : 'Export PDF'}
        </button>
        {selectedFindings.size > 0 && (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {selectedFindings.size} findings selected for validation
          </span>
        )}
      </div>
    </div>
  );
}

// Client-side print HTML generation (fallback)
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
    <title>LaunchLens Analysis — ${context.business_type}</title>
    <style>
      body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
      h1{font-size:24px;font-weight:400;margin-bottom:4px}
      .meta{font-size:13px;color:#999;margin-bottom:32px}
      @media print{body{margin:20px}}
    </style>
  </head><body>
    <h1>${context.business_type}</h1>
    <p class="meta">${context.city}, ${context.state} — Generated ${new Date().toLocaleDateString()}</p>
    ${sectionHTML}
    ${findingsHTML}
  </body></html>`;
}
