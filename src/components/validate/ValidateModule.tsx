import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateValidation, type ValidateResult, type ValidateContext, type ScorecardMetric } from '@/lib/validate';
import SectionSkeleton from '@/components/analyze/SectionSkeleton';

// ═══ VALIDATION METHODS ═══

interface ValidationMethod {
  id: string;
  name: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  speed: 'fast' | 'medium' | 'slow';
  outputs: string[];
}

const ALL_METHODS: ValidationMethod[] = [
  { id: 'landing', name: 'Landing Page + Waitlist', description: 'Test demand with a conversion-focused page and email capture', effort: 'medium', speed: 'fast', outputs: ['landing_page', 'scorecard'] },
  { id: 'survey', name: 'Customer Survey', description: 'Validate assumptions with a structured 7-question discovery flow', effort: 'low', speed: 'fast', outputs: ['survey', 'scorecard'] },
  { id: 'community', name: 'Community Outreach', description: 'Share in targeted groups to gauge organic interest and get feedback', effort: 'low', speed: 'fast', outputs: ['whatsapp', 'communities', 'scorecard'] },
  { id: 'smoke_ad', name: 'Smoke Test Ad', description: 'Run a low-budget ad to measure click-through and signup intent', effort: 'medium', speed: 'medium', outputs: ['landing_page', 'scorecard'] },
  { id: 'presale', name: 'Pre-sale / Pricing Test', description: 'Test willingness to pay with a pricing page and payment intent', effort: 'high', speed: 'medium', outputs: ['landing_page', 'survey', 'scorecard'] },
  { id: 'concierge', name: 'Concierge MVP', description: 'Deliver the service manually to first customers before building', effort: 'high', speed: 'slow', outputs: ['survey', 'communities', 'scorecard'] },
  { id: 'interviews', name: 'Expert Interviews', description: 'Structured conversations with potential customers and domain experts', effort: 'medium', speed: 'medium', outputs: ['survey', 'scorecard'] },
  { id: 'teardown', name: 'Competitor Teardown', description: 'Side-by-side comparison highlighting your differentiation', effort: 'low', speed: 'fast', outputs: ['landing_page', 'scorecard'] },
];

const EFFORT_COLORS: Record<string, string> = { low: 'var(--accent-teal)', medium: 'var(--accent-amber)', high: '#8C6B6B' };
const SPEED_LABELS: Record<string, string> = { fast: 'Fast', medium: 'Medium', slow: 'Slow' };

type TabKey = 'landing' | 'survey' | 'whatsapp' | 'communities' | 'scorecard';

const ALL_TABS: { key: TabKey; label: string; mono: string; subtitle: string; outputKey: string; deployGuide: { tool: string; url: string; instruction: string } }[] = [
  { key: 'landing', label: 'Landing Page', mono: 'L', subtitle: 'Pitch your idea', outputKey: 'landing_page',
    deployGuide: { tool: 'Carrd / Framer / Typedream', url: 'https://carrd.co', instruction: 'Copy the headline, benefits, and CTA into a one-page builder. Connect a form to capture emails.' } },
  { key: 'survey', label: 'Survey', mono: 'S', subtitle: '7 discovery questions', outputKey: 'survey',
    deployGuide: { tool: 'Google Forms / Typeform', url: 'https://forms.google.com', instruction: 'Copy questions into a form builder. Keep it under 3 minutes to complete.' } },
  { key: 'whatsapp', label: 'Message', mono: 'W', subtitle: 'Community outreach', outputKey: 'whatsapp',
    deployGuide: { tool: 'WhatsApp / Slack / Discord', url: '', instruction: 'Replace [SURVEY_LINK] with your actual form URL, then share in the communities listed.' } },
  { key: 'communities', label: 'Communities', mono: 'C', subtitle: '10 places to test', outputKey: 'communities',
    deployGuide: { tool: 'Facebook / Reddit / Discord', url: '', instruction: 'Join each community and engage genuinely before sharing your survey or landing page.' } },
  { key: 'scorecard', label: 'Scorecard', mono: 'T', subtitle: 'Track progress', outputKey: 'scorecard',
    deployGuide: { tool: 'Dashboard', url: '', instruction: 'Update metrics as responses come in. Save to persist to your account.' } },
];

const PLATFORM_COLORS: Record<string, string> = {
  Reddit: '#8C6B6B', Facebook: '#7A8FA0', Discord: '#7A8FA0', LinkedIn: '#7A8FA0',
  Nextdoor: '#5B8C7E', WhatsApp: '#5B8C7E', Slack: '#5A5A5A', Twitter: '#7A8FA0',
  Instagram: '#8C6B6B', TikTok: '#5A5A5A',
};

// ═══ UTILITIES ═══

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-[6px] px-2.5 py-1 transition-all duration-200"
      style={{
        fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
        color: copied ? 'var(--accent-teal)' : 'var(--text-muted)',
        backgroundColor: copied ? 'rgba(45,139,117,0.06)' : 'var(--surface-input)',
        border: 'none', cursor: 'pointer',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function EditableText({ value, onChange, multiline, style }: { value: string; onChange: (v: string) => void; multiline?: boolean; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const Tag = multiline ? 'textarea' : 'input';
    return (
      <Tag
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(draft); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setDraft(value); } if (!multiline && e.key === 'Enter') { setEditing(false); onChange(draft); } }}
        autoFocus
        style={{
          ...style, width: '100%', border: '1px solid var(--text-primary)',
          borderRadius: 8, padding: '6px 10px', backgroundColor: '#fff', outline: 'none',
          resize: multiline ? 'vertical' : 'none', minHeight: multiline ? 80 : undefined,
        }}
      />
    );
  }
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      style={{ ...style, cursor: 'text', borderBottom: '1px dashed var(--divider-light)' }} title="Click to edit">
      {value}
    </span>
  );
}

// ═══ MAIN MODULE ═══

export default function ValidateModule() {
  const { idea, decomposeResult, discoverResult, selectedInsight, analyzeData, setupData, analyzeFindings } = useIdea();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<'select' | 'generating' | 'toolkit'>('select');
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // AI-suggested methods based on analyze data
  const suggestedMethods = useMemo(() => {
    const suggestions: string[] = [];
    const opp = analyzeData?.opportunity;
    const cust = analyzeData?.customers;
    const comp = analyzeData?.competitors;

    // High pain → Landing Page + Pre-sale
    const maxPain = cust?.segments?.reduce((max: number, s: any) => Math.max(max, s.pain_intensity || 0), 0) || 0;
    if (maxPain >= 8) { suggestions.push('landing', 'presale'); }
    else if (maxPain >= 5) { suggestions.push('landing', 'survey'); }
    else { suggestions.push('survey', 'community'); }

    // Low competition → Community outreach
    const competitorCount = comp?.competitors?.length || 0;
    if (competitorCount <= 3) suggestions.push('community');

    // High SOM → Smoke test ad
    if (opp?.som?.value && opp.som.value > 1000000) suggestions.push('smoke_ad');

    // Always suggest community
    if (!suggestions.includes('community')) suggestions.push('community');

    return [...new Set(suggestions)].slice(0, 4);
  }, [analyzeData]);

  // Auto-select suggested methods
  useEffect(() => {
    if (suggestedMethods.length > 0 && selectedMethods.size === 0) {
      setSelectedMethods(new Set(suggestedMethods));
    }
  }, [suggestedMethods]);

  // Build context from all prior tabs
  const context: ValidateContext | null = useMemo(() => {
    if (!decomposeResult) return null;
    const ctx: ValidateContext = {
      business_type: decomposeResult.stage1.business_type,
      city: decomposeResult.stage1.location.city,
      state: decomposeResult.stage1.location.state,
      target_customers: decomposeResult.stage2?.target_customers,
    };
    if (selectedInsight) ctx.insight_title = selectedInsight;
    if (discoverResult?.insights) {
      ctx.customer_quotes = discoverResult.insights
        .flatMap(i => i.sources?.map(s => s.text).filter(Boolean) || []).slice(0, 8);
      ctx.insight_evidence = discoverResult.insights.slice(0, 5)
        .map(i => `${i.title}: ${i.description}`).join('\n');
    }
    // Pull from Analyze
    if (analyzeData?.opportunity?.som) ctx.som_value = analyzeData.opportunity.som.formatted;
    if (analyzeData?.competitors?.unfilled_gaps) ctx.competitor_gaps = analyzeData.competitors.unfilled_gaps;
    if (analyzeData?.rootcause?.root_causes) ctx.root_causes = analyzeData.rootcause.root_causes.map((r: any) => r.title);
    if (analyzeData?.costs?.total_range) ctx.cost_estimate = `$${(analyzeData.costs.total_range.min / 1000).toFixed(0)}K - $${(analyzeData.costs.total_range.max / 1000).toFixed(0)}K`;
    // Pull from Setup
    if (setupData?.timeline?.phases) {
      ctx.timeline_summary = setupData.timeline.phases.map((p: any) => `${p.phase}: ${p.weeks}w`).join(', ');
    }
    return ctx;
  }, [decomposeResult, discoverResult, selectedInsight, analyzeData, setupData]);

  // Derive scorecard targets from prior data
  const deriveScorecard = useCallback((sc: ScorecardMetric[]): ScorecardMetric[] => {
    return sc.map(m => {
      // Override targets based on analyze data
      if (m.id === 'waitlist_signups' && analyzeData?.opportunity?.som?.value) {
        const somYear1 = analyzeData.opportunity.som.value;
        const target = Math.max(50, Math.round(somYear1 / 50000)); // ~0.1% of SOM as waitlist target
        return { ...m, target, target_label: `${target}+` };
      }
      if (m.id === 'price_tolerance' && setupData?.costs?.tiers) {
        const midTier = setupData.costs.tiers?.find((t: any) => t.id === (setupData.tier || 'mid'));
        if (midTier) {
          const avgCost = Math.round((midTier.cost_min + midTier.cost_max) / 2000);
          return { ...m, target: avgCost, target_label: `$${avgCost}` };
        }
      }
      return m;
    });
  }, [analyzeData, setupData]);

  // Filter tabs based on selected methods' outputs
  const visibleTabs = useMemo(() => {
    const selectedOutputs = new Set<string>();
    selectedMethods.forEach(mId => {
      const method = ALL_METHODS.find(m => m.id === mId);
      method?.outputs.forEach(o => selectedOutputs.add(o));
    });
    // Always include scorecard
    selectedOutputs.add('scorecard');
    return ALL_TABS.filter(tab => selectedOutputs.has(tab.outputKey));
  }, [selectedMethods]);

  // Auto-set activeTab to first visible tab when toolkit opens
  useEffect(() => {
    if (phase === 'toolkit' && visibleTabs.length > 0 && (!activeTab || !visibleTabs.find(t => t.key === activeTab))) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [phase, visibleTabs, activeTab]);

  const generate = useCallback(async () => {
    if (!context) return;
    setPhase('generating');
    setErrorMsg('');
    try {
      // Determine which outputs are needed based on selected methods
      const requiredOutputs = new Set<string>();
      selectedMethods.forEach(mId => {
        const method = ALL_METHODS.find(m => m.id === mId);
        method?.outputs.forEach(o => requiredOutputs.add(o));
      });
      requiredOutputs.add('scorecard');

      const data = await generateValidation(context, Array.from(requiredOutputs));
      data.scorecard = deriveScorecard(data.scorecard);
      setResult(data);
      setPhase('toolkit');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong — please try again');
      setPhase('select');
    }
  }, [context, deriveScorecard, selectedMethods]);

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateResult = (patch: Partial<ValidateResult>) => {
    if (!result) return;
    setResult({ ...result, ...patch });
  };

  const updateScorecard = (id: string, actual: number) => {
    if (!result) return;
    setResult({
      ...result,
      scorecard: result.scorecard.map(m => m.id === id ? { ...m, actual } : m),
    });
  };

  const handleSave = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!result) return;
    setSaving(true);
    try {
      const payload = {
        ...result,
        selected_methods: Array.from(selectedMethods),
        saved_at: new Date().toISOString(),
      };
      // Upsert saved idea
      const { data: existing } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
      let ideaId: string;
      if (existing) {
        await supabase.from('saved_ideas').update({ validate_data: payload as any, current_step: 'validate' }).eq('id', existing.id);
        ideaId = existing.id;
      } else {
        const { data: newIdea } = await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, validate_data: payload as any, current_step: 'validate' }).select('id').single();
        ideaId = newIdea?.id || '';
      }

      // Create experiment records for each selected method
      if (ideaId) {
        // Remove old experiments for this idea to avoid duplicates
        await supabase.from('experiments').delete().eq('idea_id', ideaId).eq('user_id', user.id);

        const scorecardObj = Object.fromEntries(result.scorecard.map(m => [m.label, { target: m.target, actual: m.actual, unit: m.unit, target_label: m.target_label }]));
        const methodEntries = Array.from(selectedMethods).map(mId => {
          const method = ALL_METHODS.find(am => am.id === mId);
          return {
            idea_id: ideaId,
            user_id: user.id,
            method_id: mId,
            method_name: method?.name || mId,
            status: result.scorecard.some(m => m.actual > 0) ? 'running' : 'planned',
            metrics: scorecardObj as any,
            assets_data: {
              landing_page: method?.outputs.includes('landing_page') ? result.landing_page : null,
              survey: method?.outputs.includes('survey') ? result.survey : null,
              whatsapp: method?.outputs.includes('whatsapp') ? result.whatsapp : null,
              communities: method?.outputs.includes('communities') ? result.communities : null,
            } as any,
          };
        });
        await supabase.from('experiments').insert(methodEntries);
      }

      toast.success('Validation & experiments saved to dashboard');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const handleExportPDF = useCallback(() => {
    if (!result) return;
    setExporting(true);
    const printWin = window.open('', '_blank');
    if (!printWin) { setExporting(false); return; }
    const biz = context?.business_type || idea;
    const loc = context ? `${context.city}, ${context.state}` : '';
    let html = `<!DOCTYPE html><html><head><title>LaunchLens Validation — ${biz}</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
      h1{font-size:24px;font-weight:400;margin-bottom:4px}h2{font-size:18px;font-weight:500;margin:28px 0 12px;border-bottom:1px solid #e5e5e5;padding-bottom:8px}
      .meta{font-size:13px;color:#999;margin-bottom:32px}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      td,th{text-align:left;padding:6px 10px;border-bottom:1px solid #eee}th{font-weight:500;color:#666}
      .benefit{margin:4px 0;padding-left:16px}blockquote{border-left:3px solid #ddd;margin:12px 0;padding:8px 16px;color:#666;font-style:italic}
      @media print{body{margin:20px}}</style>
    </head><body>
      <h1>Validation Kit — ${biz}</h1><p class="meta">${loc} — Generated ${new Date().toLocaleDateString()}</p>`;
    html += `<p><strong>Methods:</strong> ${Array.from(selectedMethods).map(m => ALL_METHODS.find(am => am.id === m)?.name || m).join(', ')}</p>`;
    const lp = result.landing_page;
    html += `<h2>Landing Page Copy</h2><p style="font-size:20px;font-weight:500">${lp.headline}</p><p style="color:#666">${lp.subheadline}</p>`;
    lp.benefits.forEach(b => { html += `<p class="benefit">— ${b}</p>`; });
    html += `<p><strong>CTA:</strong> ${lp.cta}</p><blockquote>${lp.social_proof}</blockquote>`;
    html += `<h2>Survey</h2><table><tr><th>#</th><th>Question</th><th>Type</th></tr>`;
    result.survey.forEach((q, i) => { html += `<tr><td>${i + 1}</td><td>${q.question}</td><td>${q.type}</td></tr>`; });
    html += `</table>`;
    html += `<h2>Outreach Message</h2><div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-line">${result.whatsapp.message}</div>`;
    html += `<h2>Communities</h2><table><tr><th>Name</th><th>Platform</th><th>Members</th></tr>`;
    result.communities.forEach(c => { html += `<tr><td>${c.name}</td><td>${c.platform}</td><td>${c.members}</td></tr>`; });
    html += `</table>`;
    html += `<h2>Scorecard</h2><table><tr><th>Metric</th><th>Target</th><th>Current</th></tr>`;
    result.scorecard.forEach(m => { html += `<tr><td>${m.label}</td><td>${m.target_label}</td><td>${m.actual} ${m.unit}</td></tr>`; });
    html += `</table></body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => { printWin.print(); setExporting(false); }, 500);
  }, [result, context, idea, selectedMethods]);

  // ═══ EMPTY STATE ═══
  if (!decomposeResult) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 400 }}>
        <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Start with your idea first</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Head to the Understand tab to enter your business idea. We need that context before building your validation toolkit.
        </p>
      </div>
    </div>
  );

  // ═══ PHASE 1: METHOD SELECTION ═══
  if (phase === 'select') return (
    <div ref={containerRef} className="scroll-reveal">
      <div className="mb-10">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>VALIDATE</p>
        <p className="font-heading" style={{ fontSize: 24, marginBottom: 4 }}>How do you want to test demand?</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Pick the methods that fit your stage. We'll build a ready-to-deploy toolkit — landing page copy, survey questions, outreach messages, target communities, and success benchmarks.
        </p>
      </div>

      {/* AI Suggestion Banner */}
      {suggestedMethods.length > 0 && (
        <div className="rounded-[14px] mb-8 p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, fontSize: 9, fontWeight: 500, fontFamily: "'Inter', sans-serif", backgroundColor: 'var(--text-primary)', color: '#fff' }}>AI</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
              Recommended based on your analysis
            </span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {analyzeData?.customers?.segments?.[0]?.pain_intensity >= 8
              ? 'High customer pain detected — landing page and pre-sale are your strongest validation methods.'
              : analyzeData?.competitors?.competitors?.length <= 3
                ? 'Low competition in your market — community outreach will help you capture early adopters.'
                : 'Based on your market analysis, these methods balance speed and signal quality.'}
          </p>
        </div>
      )}

      {/* Method Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {ALL_METHODS.map(m => {
          const isSelected = selectedMethods.has(m.id);
          const isSuggested = suggestedMethods.includes(m.id);
          return (
            <MethodCard key={m.id} method={m} isSelected={isSelected} isSuggested={isSuggested} onToggle={() => toggleMethod(m.id)} />
          );
        })}
      </div>

      {/* Generate button */}
      <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: '1px solid var(--divider)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}>
          {selectedMethods.size} method{selectedMethods.size !== 1 ? 's' : ''} selected
        </p>
        <button
          onClick={generate}
          disabled={selectedMethods.size === 0 || !context}
          className="rounded-[10px] px-6 py-3 transition-all duration-200"
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400,
            backgroundColor: selectedMethods.size > 0 ? 'var(--text-primary)' : 'var(--divider-light)',
            color: selectedMethods.size > 0 ? '#fff' : 'var(--text-muted)',
            border: 'none', cursor: selectedMethods.size > 0 ? 'pointer' : 'default',
          }}
        >
          Build My Toolkit
        </button>
      </div>

      {errorMsg && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C6060', marginTop: 12, textAlign: 'right' }}>{errorMsg}</p>
      )}
    </div>
  );

  // ═══ PHASE 2: GENERATING ═══
  if (phase === 'generating') return (
    <div ref={containerRef} className="scroll-reveal">
      <div className="mb-10">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>VALIDATE</p>
        <p className="font-heading" style={{ fontSize: 24, marginBottom: 4 }}>Crafting your toolkit</p>
      </div>
      <SectionSkeleton label="Writing landing page copy, designing survey questions, drafting outreach messages, finding communities, and setting benchmarks..." />
    </div>
  );

  // ═══ PHASE 3: TOOLKIT ═══
  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>VALIDATE</p>
          <p className="font-heading" style={{ fontSize: 24, marginBottom: 4 }}>Validation Toolkit</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {selectedMethods.size} methods — {Array.from(selectedMethods).map(m => ALL_METHODS.find(am => am.id === m)?.name).filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save to Dashboard'}
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button onClick={() => setPhase('select')} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
            Change Methods
          </button>
          <button onClick={generate} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
            Regenerate
          </button>
        </div>
      </div>

      {/* Tab navigation — only show tabs for selected methods */}
      <div className="flex gap-1 mb-8 overflow-x-auto hide-scrollbar pb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-2 px-4 py-3 transition-all duration-200 whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isActive ? 400 : 300, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 5, fontSize: 9, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                backgroundColor: 'var(--text-primary)', color: '#fff',
              }}>{tab.mono}</span>
              {tab.label}
              {isActive && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 1.5, backgroundColor: 'var(--text-primary)', borderRadius: 1 }} />}
            </button>
          );
        })}
      </div>

      {/* Deploy guide for active tab */}
      {activeTab && (() => {
        const currentTab = ALL_TABS.find(t => t.key === activeTab);
        if (!currentTab) return null;
        return (
          <div className="flex items-center gap-3 mb-6 rounded-[10px] px-4 py-3" style={{ backgroundColor: 'var(--surface-input)', border: '1px solid var(--divider-light)' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Deploy</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {currentTab.deployGuide.instruction}
            </span>
            {currentTab.deployGuide.url && (
              <a href={currentTab.deployGuide.url} target="_blank" rel="noopener noreferrer"
                className="rounded-[6px] px-3 py-1.5 transition-all duration-200 whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-primary)', backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', textDecoration: 'none', flexShrink: 0 }}>
                {currentTab.deployGuide.tool.split(' / ')[0]}
              </a>
            )}
          </div>
        );
      })()}

      {/* Content — only render sections for visible tabs */}
      <div style={{ minHeight: 300, maxWidth: 800 }}>
        {result && (
          <>
            {activeTab === 'landing' && result.landing_page && <LandingSection data={result.landing_page} onChange={(lp) => updateResult({ landing_page: lp })} />}
            {activeTab === 'survey' && result.survey && <SurveySection data={result.survey} onChange={(s) => updateResult({ survey: s })} />}
            {activeTab === 'whatsapp' && result.whatsapp && <WhatsAppSection data={result.whatsapp} onChange={(w) => updateResult({ whatsapp: w })} />}
            {activeTab === 'communities' && result.communities && <CommunitiesSection data={result.communities} />}
            {activeTab === 'scorecard' && <ScorecardSection data={result.scorecard} onUpdate={updateScorecard} analyzeData={analyzeData} setupData={setupData} />}
          </>
        )}
      </div>
    </div>
  );
}

// ═══ METHOD CARD ═══

function MethodCard({ method, isSelected, isSuggested, onToggle }: { method: ValidationMethod; isSelected: boolean; isSuggested: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-[14px] transition-all duration-200"
      style={{
        padding: 24, cursor: 'pointer',
        backgroundColor: isSelected ? 'rgba(26,26,26,0.02)' : 'var(--surface-card)',
        border: isSelected ? '1.5px solid var(--text-primary)' : '1px solid var(--divider-light)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)' }}>{method.name}</span>
          {isSuggested && (
            <span className="rounded-full px-2 py-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, backgroundColor: 'rgba(26,26,26,0.06)', color: 'var(--text-muted)' }}>
              Recommended
            </span>
          )}
        </div>
        <div style={{
          width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isSelected ? '2px solid var(--text-primary)' : '2px solid var(--divider-light)',
          backgroundColor: isSelected ? 'var(--text-primary)' : 'transparent', transition: 'all 200ms ease-out',
        }}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>{method.description}</p>
      <div className="flex items-center gap-3">
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
          color: EFFORT_COLORS[method.effort], padding: '2px 8px', borderRadius: 6,
          backgroundColor: `${EFFORT_COLORS[method.effort]}10`,
        }}>{method.effort} effort</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>{SPEED_LABELS[method.speed]}</span>
      </div>
    </div>
  );
}

// ═══ LANDING PAGE SECTION ═══

function LandingSection({ data, onChange }: { data: ValidateResult['landing_page']; onChange: (d: ValidateResult['landing_page']) => void }) {
  const allText = `${data.headline}\n${data.subheadline}\n\n${data.benefits.join('\n')}\n\n${data.cta}\n\n${data.social_proof}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>LANDING PAGE COPY</p>
        <CopyButton text={allText} />
      </div>
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--surface-card)' }}>
        <div style={{ padding: '48px 32px', textAlign: 'center', backgroundColor: 'var(--surface-bg)' }}>
          <div style={{ marginBottom: 16 }}>
            <EditableText value={data.headline} onChange={(v) => onChange({ ...data, headline: v })}
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.25, display: 'inline' }} />
          </div>
          <div style={{ marginBottom: 32 }}>
            <EditableText value={data.subheadline} onChange={(v) => onChange({ ...data, subheadline: v })}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'inline' }} />
          </div>
          <div style={{ maxWidth: 380, margin: '0 auto 32px', textAlign: 'left' }}>
            {data.benefits.map((b, i) => (
              <div key={i} className="flex items-start" style={{ gap: 10, marginBottom: 10 }}>
                <span style={{ color: 'var(--accent-teal)', fontSize: 13, marginTop: 2, flexShrink: 0 }}>—</span>
                <EditableText value={b} onChange={(v) => { const next = [...data.benefits]; next[i] = v; onChange({ ...data, benefits: next }); }}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }} />
              </div>
            ))}
          </div>
          <div className="rounded-[10px] inline-block" style={{ padding: '12px 28px', backgroundColor: 'var(--text-primary)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400 }}>
            <EditableText value={data.cta} onChange={(v) => onChange({ ...data, cta: v })} style={{ color: '#fff' }} />
          </div>
          <div style={{ marginTop: 24 }}>
            <EditableText value={data.social_proof} onChange={(v) => onChange({ ...data, social_proof: v })}
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--text-muted)', display: 'inline' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ SURVEY SECTION ═══

function SurveySection({ data, onChange }: { data: ValidateResult['survey']; onChange: (d: ValidateResult['survey']) => void }) {
  const allText = data.map((q, i) => `${i + 1}. ${q.question}${q.options ? '\n   ' + q.options.join(' / ') : ''}`).join('\n\n');
  const typeLabels: Record<string, string> = { scale: 'Scale', multiple_choice: 'Multiple choice', open: 'Open text', yes_no: 'Yes / No', email: 'Email capture' };
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>CUSTOMER DISCOVERY SURVEY</p>
        <CopyButton text={allText} />
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {data.map((q, i) => (
          <div key={q.id} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start gap-3">
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                backgroundColor: 'rgba(26,26,26,0.05)', color: 'var(--text-muted)',
              }}>{i + 1}</span>
              <div className="flex-1">
                <EditableText value={q.question} onChange={(v) => { const next = [...data]; next[i] = { ...q, question: v }; onChange(next); }}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5 }} />
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, backgroundColor: 'var(--surface-input)' }}>{typeLabels[q.type] || q.type}</span>
                </div>
                {q.options && (
                  <div className="flex flex-wrap mt-3" style={{ gap: 6 }}>
                    {q.options.map((o, oi) => (
                      <span key={oi} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--divider-light)' }}>{o}</span>
                    ))}
                  </div>
                )}
                {q.type === 'email' && (
                  <div className="mt-3 rounded-[8px]" style={{ padding: '8px 12px', border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-input)' }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>email@example.com</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ WHATSAPP SECTION ═══

function WhatsAppSection({ data, onChange }: { data: NonNullable<ValidateResult['whatsapp']>; onChange: (d: NonNullable<ValidateResult['whatsapp']>) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>COMMUNITY OUTREACH MESSAGE</p>
        <CopyButton text={data.message} />
      </div>
      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, backgroundColor: 'var(--surface-input)' }}>Tone: {data.tone}</span>
        </div>
        <div className="rounded-[12px]" style={{ padding: '20px 24px', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--divider-light)' }}>
          <EditableText value={data.message} onChange={(v) => onChange({ ...data, message: v })} multiline
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }} />
        </div>
      </div>
    </div>
  );
}

// ═══ COMMUNITIES SECTION ═══

function CommunitiesSection({ data }: { data: ValidateResult['communities'] }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>COMMUNITIES TO TEST</p>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>{data.length} communities</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {data.map((c, i) => {
          const isHov = hoveredId === i;
          const platformColor = PLATFORM_COLORS[c.platform] || 'var(--text-muted)';
          return (
            <div key={i} className="rounded-[12px] p-5 transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-card)',
                boxShadow: isHov ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                transform: isHov ? 'translateY(-1px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredId(i)} onMouseLeave={() => setHoveredId(null)}>
              <div className="flex items-center justify-between mb-3">
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', textDecoration: 'none' }}>{c.name}</a>
                <span className="rounded-full px-2 py-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, backgroundColor: platformColor, color: '#fff' }}>{c.platform}</span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginBottom: 6 }}>{c.members} members</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.rationale}</p>
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 rounded-[6px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', backgroundColor: 'var(--surface-input)', textDecoration: 'none', border: 'none' }}>
                Visit community
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ SCORECARD SECTION ═══

function ScorecardSection({ data, onUpdate, analyzeData, setupData }: {
  data: ScorecardMetric[];
  onUpdate: (id: string, actual: number) => void;
  analyzeData: Record<string, any>;
  setupData: Record<string, any>;
}) {
  // Compute verdict
  const verdict = useMemo(() => {
    const hasData = data.some(m => m.actual > 0);
    if (!hasData) return { label: 'Awaiting data', color: 'var(--text-muted)', bg: 'var(--surface-bg)', reasoning: 'Enter your validation results above to get a recommendation.' };

    const metPct = data.filter(m => m.target > 0 && m.actual >= m.target).length / Math.max(data.filter(m => m.target > 0).length, 1);
    if (metPct >= 0.7) return { label: 'GO', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.06)', reasoning: 'Strong signals across your validation metrics. Move forward with confidence.' };
    if (metPct >= 0.4) return { label: 'PIVOT', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.06)', reasoning: 'Mixed signals. Refine your positioning or target a narrower segment before investing further.' };
    return { label: 'RECONSIDER', color: '#8C6060', bg: 'rgba(224,82,82,0.06)', reasoning: 'Weak demand signals. Consider a fundamentally different approach or target market.' };
  }, [data]);

  // Context summary
  const contextSummary = useMemo(() => {
    const items: string[] = [];
    if (analyzeData?.opportunity?.som?.formatted) items.push(`SOM: ${analyzeData.opportunity.som.formatted}`);
    if (analyzeData?.customers?.segments?.[0]) items.push(`Primary segment: ${analyzeData.customers.segments[0].name}`);
    if (setupData?.tier) items.push(`Tier: ${setupData.tier.toUpperCase()}`);
    if (analyzeData?.costs?.total_range) items.push(`Budget: $${(analyzeData.costs.total_range.min / 1000).toFixed(0)}K-$${(analyzeData.costs.total_range.max / 1000).toFixed(0)}K`);
    return items;
  }, [analyzeData, setupData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>VALIDATION SCORECARD</p>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>Track your progress</span>
      </div>

      {/* Context from prior tabs */}
      {contextSummary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {contextSummary.map((item, i) => (
            <span key={i} className="rounded-[6px] px-2.5 py-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', backgroundColor: 'var(--surface-input)' }}>
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {data.map((m) => {
          const pct = m.target > 0 ? Math.min((m.actual / m.target) * 100, 100) : 0;
          const barColor = pct >= 100 ? 'var(--accent-teal)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--divider-light)';
          return (
            <div key={m.id} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{m.label}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>Target: {m.target_label}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <input type="number" value={m.actual || ''} onChange={(e) => onUpdate(m.id, Number(e.target.value) || 0)} placeholder="0"
                  style={{ width: 72, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-bg)', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.06)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider-light)'; e.currentTarget.style.boxShadow = 'none'; }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 2, transition: 'width 300ms ease-out' }} />
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{Math.round(pct)}%</p>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="rounded-[16px] text-center mt-8" style={{ padding: 32, backgroundColor: verdict.bg }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Verdict</p>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, fontWeight: 400, color: verdict.color, letterSpacing: '-0.02em', marginBottom: 16 }}>{verdict.label}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 500, margin: '0 auto' }}>{verdict.reasoning}</p>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 16 }}>
        Update metrics as you collect data. Save to persist progress to your dashboard.
      </p>
    </div>
  );
}
