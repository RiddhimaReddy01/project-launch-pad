import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateValidation, type ValidateResult, type ValidateContext } from '@/lib/validate';
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
  { id: 'smoke_ad', name: 'Smoke Test Ad', description: 'Run a low-budget ad to measure click-through and signup intent', effort: 'medium', speed: 'medium', outputs: ['scorecard'] },
  { id: 'presale', name: 'Pre-sale / Pricing Test', description: 'Test willingness to pay with a pricing page and payment intent', effort: 'high', speed: 'medium', outputs: ['survey', 'scorecard'] },
  { id: 'concierge', name: 'Concierge MVP', description: 'Deliver the service manually to first customers before building', effort: 'high', speed: 'slow', outputs: ['survey', 'communities', 'scorecard'] },
  { id: 'interviews', name: 'Expert Interviews', description: 'Structured conversations with potential customers and domain experts', effort: 'medium', speed: 'medium', outputs: ['survey', 'scorecard'] },
  { id: 'teardown', name: 'Competitor Teardown', description: 'Side-by-side comparison highlighting your differentiation', effort: 'low', speed: 'fast', outputs: ['scorecard'] },
];

const EFFORT_COLORS: Record<string, string> = { low: 'var(--accent-teal)', medium: 'var(--accent-amber)', high: 'hsl(var(--destructive))' };
const SPEED_LABELS: Record<string, string> = { fast: 'Fast', medium: 'Medium', slow: 'Slow' };

type TabKey = 'landing' | 'survey' | 'whatsapp' | 'communities';

const ALL_TABS: { key: TabKey; label: string; mono: string; subtitle: string; outputKey: string; target: string; deployGuide: { tool: string; urls: { name: string; url: string }[]; instruction: string } }[] = [
  { key: 'landing', label: 'Landing Page', mono: 'L', subtitle: 'Pitch your idea', outputKey: 'landing_page',
    target: '50+ email signups in 7 days',
    deployGuide: { tool: 'One-page builder', urls: [
      { name: 'Carrd', url: 'https://carrd.co' },
      { name: 'Framer', url: 'https://framer.com' },
      { name: 'Typedream', url: 'https://typedream.com' },
    ], instruction: 'Copy the headline, benefits, and CTA into a one-page builder. Connect a form (Mailchimp, ConvertKit) to capture emails.' } },
  { key: 'survey', label: 'Survey', mono: 'S', subtitle: '7 discovery questions', outputKey: 'survey',
    target: '30+ responses with 60%+ completion',
    deployGuide: { tool: 'Form builder', urls: [
      { name: 'Google Forms', url: 'https://forms.google.com' },
      { name: 'Typeform', url: 'https://typeform.com' },
      { name: 'Tally', url: 'https://tally.so' },
    ], instruction: 'Copy questions into a form builder. Keep it under 3 minutes to complete. Share via communities and direct outreach.' } },
  { key: 'whatsapp', label: 'Message', mono: 'W', subtitle: 'Community outreach', outputKey: 'whatsapp',
    target: '10+ replies from 50 messages sent',
    deployGuide: { tool: 'Messaging platforms', urls: [
      { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
      { name: 'Slack', url: 'https://slack.com' },
      { name: 'Discord', url: 'https://discord.com' },
    ], instruction: 'Replace [SURVEY_LINK] with your actual form URL. Share in communities below. Send to 5-10 people first to test the message.' } },
  { key: 'communities', label: 'Communities', mono: 'C', subtitle: 'Places to test', outputKey: 'communities',
    target: '5+ communities engaged, 3+ with warm reception',
    deployGuide: { tool: 'Social platforms', urls: [
      { name: 'Reddit', url: 'https://reddit.com' },
      { name: 'Facebook Groups', url: 'https://facebook.com/groups' },
      { name: 'Discord', url: 'https://discord.com' },
    ], instruction: 'Join each community and engage genuinely for 2-3 days before sharing your survey or landing page. Follow community rules.' } },
];

const PLATFORM_COLORS: Record<string, string> = {
  Reddit: 'hsl(var(--destructive))', Facebook: 'var(--accent-blue)', Discord: 'var(--accent-blue)', LinkedIn: 'var(--accent-blue)',
  Nextdoor: 'var(--accent-teal)', WhatsApp: 'var(--accent-teal)', Slack: 'var(--text-secondary)', Twitter: 'var(--accent-blue)',
  Instagram: 'hsl(var(--destructive))', TikTok: 'var(--text-secondary)',
};

function filterValidateResult(result: ValidateResult, outputs: Set<string>): ValidateResult {
  return {
    landing_page: outputs.has('landing_page') ? result.landing_page : null,
    survey: outputs.has('survey') ? result.survey : null,
    whatsapp: outputs.has('whatsapp') ? result.whatsapp : null,
    communities: outputs.has('communities') ? result.communities : null,
    scorecard: result.scorecard || [],
    strategy: result.strategy || null,
    expected_outcomes: result.expected_outcomes || {},
    simulation: result.simulation || {},
    recommended_sequence: result.recommended_sequence || [],
  };
}

// ═══ UTILITIES ═══

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-lg px-3 py-1.5 transition-all duration-200"
      style={{
        fontSize: 12, fontWeight: 500,
        color: copied ? 'var(--accent-teal)' : 'var(--text-secondary)',
        backgroundColor: copied ? 'rgba(0,191,166,0.1)' : 'var(--surface-elevated)',
        border: `1px solid ${copied ? 'var(--accent-teal)' : 'var(--divider)'}`,
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
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
          ...style, width: '100%', border: '1px solid var(--accent-primary)',
          borderRadius: 8, padding: '8px 12px', backgroundColor: 'var(--surface-elevated)', outline: 'none',
          color: 'var(--text-primary)',
          resize: multiline ? 'vertical' : 'none', minHeight: multiline ? 80 : undefined,
        }}
      />
    );
  }
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      style={{ ...style, cursor: 'text', borderBottom: '1px dashed var(--divider-section)' }} title="Click to edit">
      {value}
    </span>
  );
}

// ═══ MAIN MODULE ═══

export default function ValidateModule() {
  const { idea, decomposeResult, discoverResult, selectedInsight, analyzeData, setupData, validateData, setValidateData, analyzeFindings } = useIdea();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<'select' | 'generating' | 'toolkit'>('select');
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [result, setResult] = useState<ValidateResult | null>(validateData);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  useEffect(() => {
    if (validateData && !result) {
      setResult(validateData);
      setPhase('toolkit');
    }
  }, [validateData, result]);

  useEffect(() => {
    const savedMethods = (validateData as ValidateResult & { selected_methods?: string[] } | null)?.selected_methods;
    if (savedMethods?.length) {
      setSelectedMethods(new Set(savedMethods));
    }
  }, [validateData]);

  const suggestedMethods = useMemo(() => {
    const suggestions: string[] = [];
    const cust = analyzeData?.customers;
    const comp = analyzeData?.competitors;
    const opp = analyzeData?.opportunity;

    const maxPain = Array.isArray(cust?.segments) ? cust.segments.reduce((max: number, s: any) => Math.max(max, s.pain_intensity || 0), 0) : 0;
    if (maxPain >= 8) { suggestions.push('landing', 'presale'); }
    else if (maxPain >= 5) { suggestions.push('landing', 'survey'); }
    else { suggestions.push('survey', 'community'); }

    const competitorCount = comp?.competitors?.length || 0;
    if (competitorCount <= 3) suggestions.push('community');
    if (opp?.som?.value && opp.som.value > 1000000) suggestions.push('smoke_ad');
    if (!suggestions.includes('community')) suggestions.push('community');

    return [...new Set(suggestions)].slice(0, 4);
  }, [analyzeData]);

  useEffect(() => {
    if (suggestedMethods.length > 0 && selectedMethods.size === 0) {
      setSelectedMethods(new Set(suggestedMethods));
    }
  }, [suggestedMethods]);

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
    if (analyzeData?.opportunity?.som) ctx.som_value = analyzeData.opportunity.som.formatted;
    if (analyzeData?.competitors?.unfilled_gaps) ctx.competitor_gaps = analyzeData.competitors.unfilled_gaps;
    if (analyzeData?.rootcause?.root_causes) ctx.root_causes = analyzeData.rootcause.root_causes.map((r: any) => r.title);
    if (analyzeData?.costs?.total_range) ctx.cost_estimate = `$${(analyzeData.costs.total_range.min / 1000).toFixed(0)}K - $${(analyzeData.costs.total_range.max / 1000).toFixed(0)}K`;
    if (setupData?.timeline?.phases) {
      ctx.timeline_summary = setupData.timeline.phases.map((p: any) => `${p.phase}: ${p.weeks}w`).join(', ');
    }
    return ctx;
  }, [decomposeResult, discoverResult, selectedInsight, analyzeData, setupData]);

  const relevantOutputs = useMemo(() => {
    const outputs = new Set<string>();
    selectedMethods.forEach(mId => {
      const method = ALL_METHODS.find(m => m.id === mId);
      method?.outputs.forEach(o => outputs.add(o));
    });
    return outputs;
  }, [selectedMethods]);

  const visibleTabs = ALL_TABS.filter((tab) => relevantOutputs.has(tab.outputKey));

  useEffect(() => {
    if (phase !== 'toolkit') return;
    if (visibleTabs.length === 0) {
      setActiveTab(null);
      return;
    }
    if (!activeTab || !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [phase, visibleTabs, activeTab]);

  const generate = useCallback(async () => {
    if (!idea) return;
    setPhase('generating');
    setErrorMsg('');
    try {
      const requestedOutputs = Array.from(relevantOutputs);
      if (!requestedOutputs.includes('scorecard')) requestedOutputs.push('scorecard');
      const rawData = context
        ? await generateValidation(context, requestedOutputs)
        : await generateValidation(idea, requestedOutputs);
      const data = filterValidateResult(rawData, new Set(requestedOutputs));
      setResult(data);
      setValidateData(data);
      setPhase('toolkit');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong - please try again');
      setPhase('select');
    }
  }, [idea, context, relevantOutputs, setValidateData]);

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateResult = (patch: Partial<ValidateResult>) => {
    if (!result) return;
    const next = { ...result, ...patch };
    setResult(next);
    setValidateData(next);
  };

  const handleSave = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!result) return;
    setSaving(true);
    try {
      const payload = {
        ...filterValidateResult(result, relevantOutputs),
        selected_methods: Array.from(selectedMethods),
        saved_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
      let ideaId: string;
      if (existing) {
        await supabase.from('saved_ideas').update({ validate_data: payload as any, current_step: 'validate' }).eq('id', existing.id);
        ideaId = existing.id;
      } else {
        const { data: newIdea } = await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, validate_data: payload as any, current_step: 'validate' }).select('id').single();
        ideaId = newIdea?.id || '';
      }

      if (ideaId) {
        await supabase.from('experiments').delete().eq('idea_id', ideaId).eq('user_id', user.id);
        const methodEntries = Array.from(selectedMethods).map(mId => {
          const method = ALL_METHODS.find(am => am.id === mId);
          return {
            idea_id: ideaId,
            user_id: user.id,
            method_id: mId,
            method_name: method?.name || mId,
            status: 'planned',
            metrics: {} as any,
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

      toast.success('Validation saved to dashboard');
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
    let html = `<!DOCTYPE html><html><head><title>Launch Lean Validation - ${biz}</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
      h1{font-size:24px;font-weight:600;margin-bottom:4px}h2{font-size:18px;font-weight:600;margin:28px 0 12px;border-bottom:1px solid #e5e5e5;padding-bottom:8px}
      .meta{font-size:13px;color:#999;margin-bottom:32px}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      td,th{text-align:left;padding:6px 10px;border-bottom:1px solid #eee}th{font-weight:600;color:#666}
      .benefit{margin:4px 0;padding-left:16px}blockquote{border-left:3px solid #ddd;margin:12px 0;padding:8px 16px;color:#666}
      @media print{body{margin:20px}}</style>
    </head><body>
      <h1>Validation Kit — ${biz}</h1><p class="meta">${loc} · Generated ${new Date().toLocaleDateString()}</p>`;
    html += `<p><strong>Methods:</strong> ${Array.from(selectedMethods).map(m => ALL_METHODS.find(am => am.id === m)?.name || m).join(', ')}</p>`;
    const exportable = filterValidateResult(result, relevantOutputs);
    const lp = exportable.landing_page;
    if (lp) {
      html += `<h2>Landing Page Copy</h2><p style="font-size:20px;font-weight:600">${lp.headline}</p><p style="color:#666">${lp.subheadline}</p>`;
      lp.benefits.forEach(b => { html += `<p class="benefit">— ${b}</p>`; });
      html += `<p><strong>CTA:</strong> ${lp.cta}</p><blockquote>${lp.social_proof}</blockquote>`;
    }
    if (exportable.survey) {
      html += `<h2>Survey</h2><table><tr><th>#</th><th>Question</th><th>Type</th></tr>`;
      exportable.survey.forEach((q, i) => { html += `<tr><td>${i + 1}</td><td>${q.question}</td><td>${q.type}</td></tr>`; });
      html += `</table>`;
    }
    if (exportable.whatsapp) {
      html += `<h2>Outreach Message</h2><div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-line">${exportable.whatsapp.message}</div>`;
    }
    if (exportable.communities) {
      html += `<h2>Communities</h2><table><tr><th>Name</th><th>Platform</th><th>Members</th></tr>`;
      exportable.communities.forEach(c => { html += `<tr><td>${c.name}</td><td>${c.platform}</td><td>${c.members}</td></tr>`; });
      html += `</table>`;
    }
    html += `<h2>Scorecard</h2><table><tr><th>Metric</th><th>Target</th></tr>`;
    result.scorecard.forEach(m => { html += `<tr><td>${m.label}</td><td>${m.target_label}</td></tr>`; });
    html += `</table></body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => { printWin.print(); setExporting(false); }, 500);
  }, [result, context, idea, selectedMethods, relevantOutputs]);

  // ═══ EMPTY STATE ═══
  if (!decomposeResult) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 420 }}>
        <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Start with your idea first</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Enter your business idea on the home page. We need that context before building your validation toolkit.
        </p>
      </div>
    </div>
  );

  // ═══ PHASE 1: METHOD SELECTION ═══
  if (phase === 'select') return (
    <div ref={containerRef} className="scroll-reveal">
      <div className="mb-10">
        <p className="section-label mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>VALIDATE</p>
        <p className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          How do you want to test demand?
        </p>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 600 }}>
          Pick the methods that fit your stage. We&apos;ll build only the materials you selected, ready to use right away.
        </p>
      </div>

      {/* Suggested method banner */}
      {suggestedMethods.length > 0 && (
        <div className="mb-8 rounded-xl overflow-hidden" style={{ 
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--divider)',
          boxShadow: 'var(--shadow-sm)',
          padding: '20px 24px',
        }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="mono-badge" style={{ width: 30, height: 30, fontSize: 11, fontWeight: 700 }}>TOP</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Recommended methods for this idea
            </span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {analyzeData?.customers?.segments?.[0]?.pain_intensity >= 8
              ? 'High customer pain detected. Landing page and pre-sale are your strongest validation methods.'
              : analyzeData?.competitors?.competitors?.length <= 3
                ? 'Low competition in your market. Community outreach will help you capture early adopters.'
                : 'Based on your market analysis, these methods balance speed and signal quality.'}
          </p>
        </div>
      )}

      {/* Method Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {ALL_METHODS.map(m => {
          const isSelected = selectedMethods.has(m.id);
          const isSuggested = suggestedMethods.includes(m.id);
          return (
            <MethodCard key={m.id} method={m} isSelected={isSelected} isSuggested={isSuggested} onToggle={() => toggleMethod(m.id)} />
          );
        })}
      </div>

      {/* Generate button */}
      <div className="flex items-center justify-between mt-12 pt-8" style={{ borderTop: '1px solid var(--divider-section)' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {selectedMethods.size} method{selectedMethods.size !== 1 ? 's' : ''} selected
        </p>
        <button
          onClick={generate}
          disabled={selectedMethods.size === 0 || !context}
          className="btn-primary rounded-xl px-8 py-3.5"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          Build My Starter Toolkit →
        </button>
      </div>

      {errorMsg && (
        <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--destructive))', marginTop: 12, textAlign: 'right' }}>{errorMsg}</p>
      )}
    </div>
  );

  // ═══ PHASE 2: GENERATING ═══
  if (phase === 'generating') return (
    <div ref={containerRef} className="scroll-reveal">
      <div className="mb-10">
        <p className="section-label mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>VALIDATE</p>
        <p className="font-heading" style={{ fontSize: 28, fontWeight: 700 }}>Crafting your toolkit</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 6 }}>This takes about 15-30 seconds</p>
      </div>
      <SectionSkeleton label="Preparing your selected validation materials and benchmarks..." />
    </div>
  );

  // ═══ PHASE 3: TOOLKIT ═══
  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="section-label mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>VALIDATE</p>
          <p className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Your Starter Toolkit</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {selectedMethods.size} methods - {Array.from(selectedMethods).map(m => ALL_METHODS.find(am => am.id === m)?.name).filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary rounded-lg px-4 py-2" style={{ fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save to Dashboard'}
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn-secondary rounded-lg px-4 py-2" style={{ fontSize: 13, fontWeight: 500 }}>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button onClick={() => setPhase('select')} className="btn-secondary rounded-lg px-4 py-2" style={{ fontSize: 13, fontWeight: 500 }}>
            Change Methods
          </button>
          <button onClick={generate} className="btn-secondary rounded-lg px-4 py-2" style={{ fontSize: 13, fontWeight: 500 }}>
            Regenerate
          </button>
        </div>
      </div>

      {(result?.strategy || result?.simulation || result?.recommended_sequence?.length) && (
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {result?.strategy && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>VALIDATION STRATEGY</p>
              <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{result.strategy.business_model}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {result.strategy.description}
              </p>
            </div>
          )}

          {result?.simulation && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>SIMULATION</p>
              <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                {(result.simulation.expected_signups || 0).toLocaleString()} expected signups
              </p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                From {(result.simulation.starting_audience || 0).toLocaleString()} starting visitors or contacts.
              </p>
            </div>
          )}

          {result?.recommended_sequence?.length ? (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>RECOMMENDED ORDER</p>
              <div className="flex flex-col gap-2">
                {result.recommended_sequence.slice(0, 3).map((step, index) => (
                  <p key={index} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {step}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto hide-scrollbar pb-1" style={{ borderBottom: '1px solid var(--divider-section)' }}>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.key;
          const isRelevant = relevantOutputs.has(tab.outputKey);
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-2.5 px-5 py-3.5 transition-all duration-200 whitespace-nowrap"
              style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="mono-badge" style={{
                width: 22, height: 22, fontSize: 10, fontWeight: 700,
                backgroundColor: isActive ? 'var(--accent-primary)' : isRelevant ? 'var(--color-accent-soft)' : 'var(--surface-elevated)',
                color: isActive ? '#fff' : isRelevant ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}>{tab.mono}</span>
              {tab.label}
              {isRelevant && !isActive && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
              )}
              {isActive && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 2, backgroundColor: 'var(--accent-primary)', borderRadius: 1 }} />}
            </button>
          );
        })}
      </div>

      {/* Deploy guide for active tab */}
      {activeTab && (() => {
        const currentTab = ALL_TABS.find(t => t.key === activeTab);
        const currentOutcomes = result?.expected_outcomes?.[currentTab?.outputKey || ''];
        if (!currentTab) return null;
        return (
          <div className="rounded-xl mb-8 overflow-hidden" style={{ border: '1px solid var(--divider)' }}>
            <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: 'var(--color-accent-soft)', borderBottom: '1px solid var(--divider)' }}>
              <span className="section-label" style={{ flexShrink: 0, marginBottom: 0, fontWeight: 700 }}>TARGET</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{currentTab.target}</span>
            </div>
            <div className="flex items-center gap-4 px-5 py-3" style={{ backgroundColor: 'var(--surface-card)' }}>
              <span className="section-label" style={{ flexShrink: 0, marginBottom: 0, fontWeight: 700 }}>DEPLOY</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                {currentTab.deployGuide.instruction}
              </span>
              {currentTab.deployGuide.urls.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentTab.deployGuide.urls.map(u => (
                    <a key={u.name} href={u.url} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary rounded-lg px-3 py-1.5 whitespace-nowrap"
                      style={{ fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                      {u.name} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            {currentOutcomes && (
              <div className="px-5 py-4" style={{ backgroundColor: 'var(--surface-bg)', borderTop: '1px solid var(--divider)' }}>
                <p className="section-label mb-3" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>EXPECTED OUTCOMES</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentOutcomes).map(([key, value]) => (
                    <span key={key} className="badge badge-muted" title={`${key.replace(/_/g, ' ')} benchmark`}>
                      {key.replace(/_/g, ' ')}: {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div style={{ minHeight: 300, maxWidth: 820 }}>
        {result && (
          <>
            {activeTab === 'landing' && result.landing_page && <LandingSection data={result.landing_page} onChange={(lp) => updateResult({ landing_page: lp })} />}
            {activeTab === 'survey' && result.survey && <SurveySection data={result.survey} onChange={(s) => updateResult({ survey: s })} />}
            {activeTab === 'whatsapp' && result.whatsapp && <WhatsAppSection data={result.whatsapp} onChange={(w) => updateResult({ whatsapp: w })} />}
            {activeTab === 'communities' && result.communities && <CommunitiesSection data={result.communities} />}
            {!activeTab && (
              <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
                <p className="section-label" style={{ fontWeight: 700, marginBottom: 10 }}>MEASUREMENT PLAN</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  This toolkit is focused on testing and scoring, not content assets.
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                  You selected methods like smoke tests or competitive teardowns. We are keeping the output focused on measurement instead of showing an unrelated landing page.
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.scorecard.map((metric) => (
                    <span key={metric.id} className="badge badge-muted" title={`Target: ${metric.target_label}`}>
                      {metric.label}: {metric.target_label}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
      className="transition-all duration-200"
      style={{
        padding: '22px 24px', cursor: 'pointer', borderRadius: 14,
        backgroundColor: isSelected ? 'var(--color-accent-soft)' : 'var(--surface-card)',
        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--divider)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isSelected 
          ? 'var(--shadow-sm)' 
          : hovered ? 'var(--shadow-md)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{method.name}</span>
          {isSuggested && (
            <span className="rounded-full px-2.5 py-0.5" style={{ 
              fontSize: 10, fontWeight: 700, 
              backgroundColor: 'var(--color-accent-soft)', 
              color: 'var(--accent-primary)',
              letterSpacing: '0.04em',
            }}>
              Recommended
            </span>
          )}
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isSelected ? '2px solid var(--accent-primary)' : '2px solid var(--divider-section)',
          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent', transition: 'all 200ms ease-out',
        }}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{method.description}</p>
      <div className="flex items-center gap-3">
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: EFFORT_COLORS[method.effort], padding: '3px 10px', borderRadius: 6,
          backgroundColor: `${EFFORT_COLORS[method.effort]}15`,
        }}>{method.effort} effort</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{SPEED_LABELS[method.speed]}</span>
      </div>
    </div>
  );
}

// ═══ LANDING PAGE SECTION ═══

function LandingSection({ data, onChange }: { data: NonNullable<ValidateResult['landing_page']>; onChange: (d: NonNullable<ValidateResult['landing_page']>) => void }) {
  const allText = `${data.headline}\n${data.subheadline}\n\n${data.benefits.join('\n')}\n\n${data.cta}\n\n${data.social_proof}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="section-label" style={{ fontWeight: 700 }}>LANDING PAGE COPY</p>
        <CopyButton text={allText} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--divider)' }}>
        <div style={{ padding: '56px 40px', textAlign: 'center', backgroundColor: 'var(--surface-card)' }}>
          <div style={{ marginBottom: 20 }}>
            <EditableText value={data.headline} onChange={(v) => onChange({ ...data, headline: v })}
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2, display: 'inline' }} />
          </div>
          <div style={{ marginBottom: 36 }}>
            <EditableText value={data.subheadline} onChange={(v) => onChange({ ...data, subheadline: v })}
              style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7, display: 'inline' }} />
          </div>
          <div style={{ maxWidth: 420, margin: '0 auto 36px', textAlign: 'left' }}>
            {data.benefits.map((b, i) => (
              <div key={i} className="flex items-start" style={{ gap: 12, marginBottom: 12 }}>
                <span style={{ color: 'var(--accent-primary)', fontSize: 14, marginTop: 2, flexShrink: 0, fontWeight: 700 }}>✓</span>
                <EditableText value={b} onChange={(v) => { const next = [...data.benefits]; next[i] = v; onChange({ ...data, benefits: next }); }}
                  style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }} />
              </div>
            ))}
          </div>
          <div className="rounded-xl inline-block" style={{
            padding: '14px 32px',
            backgroundColor: 'var(--text-primary)',
            color: '#fff', fontSize: 15, fontWeight: 700,
          }}>
            <EditableText value={data.cta} onChange={(v) => onChange({ ...data, cta: v })} style={{ color: '#fff' }} />
          </div>
          <div style={{ marginTop: 28 }}>
            <EditableText value={data.social_proof} onChange={(v) => onChange({ ...data, social_proof: v })}
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', display: 'inline' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ SURVEY SECTION ═══

function SurveySection({ data, onChange }: { data: NonNullable<ValidateResult['survey']>; onChange: (d: NonNullable<ValidateResult['survey']>) => void }) {
  const allText = data.map((q, i) => `${i + 1}. ${q.question}${q.options ? '\n   ' + q.options.join(' / ') : ''}`).join('\n\n');
  const typeLabels: Record<string, string> = { scale: 'Scale', multiple_choice: 'Multiple choice', open: 'Open text', yes_no: 'Yes / No', email: 'Email capture' };
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="section-label" style={{ fontWeight: 700 }}>CUSTOMER DISCOVERY SURVEY</p>
        <CopyButton text={allText} />
      </div>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {data.map((q, i) => (
          <div key={q.id} className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <div className="flex items-start gap-4">
              <span className="mono-badge" style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700, backgroundColor: 'var(--color-accent-soft)', color: 'var(--accent-primary)' }}>{i + 1}</span>
              <div className="flex-1">
                <EditableText value={q.question} onChange={(v) => { const next = [...data]; next[i] = { ...q, question: v }; onChange(next); }}
                  style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }} />
                <div className="flex items-center gap-2 mt-2.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 6, backgroundColor: 'var(--surface-elevated)', letterSpacing: '0.02em' }}>{typeLabels[q.type] || q.type}</span>
                </div>
                {q.options && (
                  <div className="flex flex-wrap mt-3" style={{ gap: 8 }}>
                    {q.options.map((o, oi) => (
                      <span key={oi} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--divider-section)' }}>{o}</span>
                    ))}
                  </div>
                )}
                {q.type === 'email' && (
                  <div className="mt-3 rounded-lg" style={{ padding: '10px 14px', border: '1px solid var(--divider)', backgroundColor: 'var(--surface-elevated)' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>email@example.com</span>
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
      <div className="flex items-center justify-between mb-6">
        <p className="section-label" style={{ fontWeight: 700 }}>COMMUNITY OUTREACH MESSAGE</p>
        <CopyButton text={data.message} />
      </div>
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-2 mb-5">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: 6, backgroundColor: 'var(--color-accent-soft)' }}>Tone: {data.tone}</span>
        </div>
        <div className="rounded-xl" style={{ padding: '24px 28px', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--divider)' }}>
          <EditableText value={data.message} onChange={(v) => onChange({ ...data, message: v })} multiline
            style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }} />
        </div>
      </div>
    </div>
  );
}

// ═══ COMMUNITIES SECTION ═══

function CommunitiesSection({ data }: { data: NonNullable<ValidateResult['communities']> }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="section-label" style={{ fontWeight: 700 }}>COMMUNITIES TO TEST</p>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{data.length} communities</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {data.map((c, i) => {
          const isHov = hoveredId === i;
          const platformColor = PLATFORM_COLORS[c.platform] || 'var(--text-muted)';
          return (
            <div key={i} className="rounded-xl p-5 transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-card)',
                border: `1px solid ${isHov ? 'var(--divider-section)' : 'var(--divider)'}`,
                transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHov ? 'var(--shadow-md)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(i)} onMouseLeave={() => setHoveredId(null)}>
              <div className="flex items-center justify-between mb-3">
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>{c.name}</a>
                <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, backgroundColor: platformColor, color: '#fff' }}>{c.platform}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{c.members} members</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{c.rationale}</p>
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                className="btn-secondary inline-block mt-4 rounded-lg px-4 py-2"
                style={{ fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                Visit community ↗
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
