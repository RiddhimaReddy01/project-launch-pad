import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateValidation, type ValidateResult, type ValidateContext, type ScorecardMetric } from '@/lib/validate';
import SectionSkeleton from '@/components/analyze/SectionSkeleton';

type TabKey = 'landing' | 'survey' | 'whatsapp' | 'communities' | 'scorecard';

const TABS: { key: TabKey; label: string; mono: string; subtitle: string }[] = [
  { key: 'landing', label: 'Landing Page', mono: 'L', subtitle: 'Pitch your idea' },
  { key: 'survey', label: 'Survey', mono: 'S', subtitle: '7 discovery questions' },
  { key: 'whatsapp', label: 'Message', mono: 'W', subtitle: 'Community outreach' },
  { key: 'communities', label: 'Communities', mono: 'C', subtitle: '10 places to test' },
  { key: 'scorecard', label: 'Scorecard', mono: 'T', subtitle: 'Track progress' },
];

const PLATFORM_COLORS: Record<string, string> = {
  Reddit: '#FF4500', Facebook: '#1877F2', Discord: '#5865F2', LinkedIn: '#0A66C2',
  Nextdoor: '#00B246', WhatsApp: '#25D366', Slack: '#4A154B', Twitter: '#1DA1F2',
  Instagram: '#E4405F', TikTok: '#000000',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-[6px] px-2.5 py-1 transition-all duration-200"
      style={{
        fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
        color: copied ? '#2D8B75' : 'var(--text-muted)',
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
          ...style,
          width: '100%',
          border: '1px solid var(--accent-purple)',
          borderRadius: 8,
          padding: '6px 10px',
          backgroundColor: '#fff',
          outline: 'none',
          resize: multiline ? 'vertical' : 'none',
          minHeight: multiline ? 80 : undefined,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      style={{ ...style, cursor: 'text', borderBottom: '1px dashed var(--divider-light)' }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

export default function ValidateModule() {
  const { idea, decomposeResult, discoverResult, selectedInsight, currentStep } = useIdea();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('landing');
  const [status, setStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

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
        .flatMap(i => i.quotes || [])
        .slice(0, 8);
      ctx.insight_evidence = discoverResult.insights
        .slice(0, 5)
        .map(i => `${i.title}: ${i.description}`)
        .join('\n');
    }
    return ctx;
  }, [decomposeResult, discoverResult, selectedInsight]);

  const generate = useCallback(async () => {
    if (!context) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await generateValidation(context);
      setResult(data);
      setStatus('completed');
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed');
      setStatus('error');
    }
  }, [context]);

  // Auto-generate on mount
  useEffect(() => {
    if (context && status === 'idle') generate();
  }, [context]);

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

  const completedCount = TABS.filter(t => {
    if (!result) return false;
    return true;
  }).length;

  const handleSave = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!result) return;
    setSaving(true);
    try {
      const payload = {
        ...result,
        saved_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
      if (existing) {
        await supabase.from('saved_ideas').update({ validate_data: payload as any, current_step: 'validate' }).eq('id', existing.id);
      } else {
        await supabase.from('saved_ideas').insert({ user_id: user.id, idea_text: idea, validate_data: payload as any, current_step: 'validate' });
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

    let html = `<!DOCTYPE html><html><head><title>LaunchLens Validation — ${biz}</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
      h1{font-size:24px;font-weight:400;margin-bottom:4px}h2{font-size:18px;font-weight:500;margin:28px 0 12px;border-bottom:1px solid #e5e5e5;padding-bottom:8px}
      .meta{font-size:13px;color:#999;margin-bottom:32px}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      td,th{text-align:left;padding:6px 10px;border-bottom:1px solid #eee}th{font-weight:500;color:#666}
      .benefit{margin:4px 0;padding-left:16px}blockquote{border-left:3px solid #ddd;margin:12px 0;padding:8px 16px;color:#666;font-style:italic}
      @media print{body{margin:20px}}</style>
    </head><body>
      <h1>Validation Kit — ${biz}</h1><p class="meta">${loc} — Generated ${new Date().toLocaleDateString()}</p>`;

    // Landing page
    const lp = result.landing_page;
    html += `<h2>Landing Page Copy</h2>
      <p style="font-size:20px;font-weight:500;margin-bottom:4px">${lp.headline}</p>
      <p style="color:#666">${lp.subheadline}</p>`;
    lp.benefits.forEach(b => { html += `<p class="benefit">— ${b}</p>`; });
    html += `<p style="margin-top:12px"><strong>CTA:</strong> ${lp.cta}</p>`;
    html += `<blockquote>${lp.social_proof}</blockquote>`;

    // Survey
    html += `<h2>Customer Discovery Survey</h2><table><tr><th>#</th><th>Question</th><th>Type</th></tr>`;
    result.survey.forEach((q, i) => {
      html += `<tr><td>${i + 1}</td><td>${q.question}${q.options ? '<br><small>' + q.options.join(' / ') + '</small>' : ''}</td><td>${q.type}</td></tr>`;
    });
    html += `</table>`;

    // WhatsApp
    html += `<h2>Outreach Message</h2><p style="color:#666;font-size:12px">Tone: ${result.whatsapp.tone}</p>`;
    html += `<div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-line;font-size:14px">${result.whatsapp.message}</div>`;

    // Communities
    html += `<h2>Communities to Test</h2><table><tr><th>Name</th><th>Platform</th><th>Members</th><th>Why</th></tr>`;
    result.communities.forEach(c => {
      html += `<tr><td>${c.name}</td><td>${c.platform}</td><td>${c.members}</td><td>${c.rationale}</td></tr>`;
    });
    html += `</table>`;

    // Scorecard
    html += `<h2>Validation Scorecard</h2><table><tr><th>Metric</th><th>Target</th><th>Current</th><th>Progress</th></tr>`;
    result.scorecard.forEach(m => {
      const pct = Math.min(Math.round((m.actual / m.target) * 100), 100);
      html += `<tr><td>${m.label}</td><td>${m.target_label}</td><td>${m.actual} ${m.unit}</td><td>${pct}%</td></tr>`;
    });
    html += `</table>`;

    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => { printWin.print(); setExporting(false); }, 500);
  }, [result, context, idea]);

  if (!decomposeResult) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 400 }}>
        <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Complete the Discover step first</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Validation needs your business context from the decomposition step.
        </p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="scroll-reveal">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>VALIDATE</p>
          <p className="font-heading" style={{ fontSize: 24, marginBottom: 4 }}>Validation Kit</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            AI-generated assets to test real demand — landing page, survey, outreach, communities, and scorecard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'completed' && (
            <>
              <button onClick={handleSave} disabled={saving} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleExportPDF} disabled={exporting} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button onClick={generate} className="rounded-[8px] px-3 py-1.5 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', border: '1px solid var(--divider)', cursor: 'pointer', backgroundColor: 'transparent' }}>
                Regenerate
              </button>
            </>
          )}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>
            {status === 'completed' ? '5/5' : status === 'loading' ? '...' : '0/5'}
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto hide-scrollbar pb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-2 px-4 py-3 transition-all duration-200 whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: isActive ? 400 : 300, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 5, fontSize: 9, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                backgroundColor: status === 'completed' ? 'var(--text-primary)' : isActive ? 'rgba(26,26,26,0.08)' : 'var(--divider-light)',
                color: status === 'completed' ? '#fff' : 'var(--text-muted)',
              }}>{tab.mono}</span>
              {tab.label}
              {isActive && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 1.5, backgroundColor: 'var(--text-primary)', borderRadius: 1 }} />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ minHeight: 300, maxWidth: 800 }}>
        {status === 'loading' && <SectionSkeleton label="Generating your validation kit — landing page, survey, outreach message, communities, and scorecard..." />}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>Could not generate validation assets.</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>{errorMsg}</p>
            <button onClick={generate} className="rounded-[10px] px-5 py-2.5"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}
        {status === 'idle' && !result && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>Preparing validation context...</p>
          </div>
        )}

        {status === 'completed' && result && (
          <>
            {activeTab === 'landing' && <LandingSection data={result.landing_page} onChange={(lp) => updateResult({ landing_page: lp })} />}
            {activeTab === 'survey' && <SurveySection data={result.survey} onChange={(s) => updateResult({ survey: s })} />}
            {activeTab === 'whatsapp' && <WhatsAppSection data={result.whatsapp} onChange={(w) => updateResult({ whatsapp: w })} />}
            {activeTab === 'communities' && <CommunitiesSection data={result.communities} />}
            {activeTab === 'scorecard' && <ScorecardSection data={result.scorecard} onUpdate={updateScorecard} />}
          </>
        )}
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

      {/* Preview card */}
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--surface-card)' }}>
        <div style={{ padding: '48px 32px', textAlign: 'center', backgroundColor: 'var(--surface-bg)' }}>
          <div style={{ marginBottom: 16 }}>
            <EditableText
              value={data.headline}
              onChange={(v) => onChange({ ...data, headline: v })}
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.25, display: 'inline' }}
            />
          </div>
          <div style={{ marginBottom: 32 }}>
            <EditableText
              value={data.subheadline}
              onChange={(v) => onChange({ ...data, subheadline: v })}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'inline' }}
            />
          </div>

          <div style={{ maxWidth: 380, margin: '0 auto 32px', textAlign: 'left' }}>
            {data.benefits.map((b, i) => (
              <div key={i} className="flex items-start" style={{ gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#2D8B75', fontSize: 13, marginTop: 2, flexShrink: 0 }}>—</span>
                <EditableText
                  value={b}
                  onChange={(v) => { const next = [...data.benefits]; next[i] = v; onChange({ ...data, benefits: next }); }}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}
                />
              </div>
            ))}
          </div>

          <div className="rounded-[10px] inline-block" style={{ padding: '12px 28px', backgroundColor: 'var(--text-primary)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400 }}>
            <EditableText
              value={data.cta}
              onChange={(v) => onChange({ ...data, cta: v })}
              style={{ color: '#fff' }}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <EditableText
              value={data.social_proof}
              onChange={(v) => onChange({ ...data, social_proof: v })}
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--text-muted)', display: 'inline' }}
            />
          </div>
        </div>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
        Click any text to edit inline. Use Carrd, Framer, or Typedream to build.
      </p>
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
                width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                backgroundColor: 'rgba(26,26,26,0.05)', color: 'var(--text-muted)',
              }}>{i + 1}</span>
              <div className="flex-1">
                <EditableText
                  value={q.question}
                  onChange={(v) => { const next = [...data]; next[i] = { ...q, question: v }; onChange(next); }}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5 }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
                    color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4,
                    backgroundColor: 'var(--surface-input)',
                  }}>{typeLabels[q.type] || q.type}</span>
                </div>
                {q.options && (
                  <div className="flex flex-wrap mt-3" style={{ gap: 6 }}>
                    {q.options.map((o, oi) => (
                      <span key={oi} style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300,
                        color: 'var(--text-secondary)', padding: '4px 10px',
                        borderRadius: 6, border: '1px solid var(--divider-light)',
                      }}>{o}</span>
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

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 12 }}>
        Use Google Forms or Typeform. Keep it under 3 minutes to complete.
      </p>
    </div>
  );
}

// ═══ WHATSAPP SECTION ═══

function WhatsAppSection({ data, onChange }: { data: ValidateResult['whatsapp']; onChange: (d: ValidateResult['whatsapp']) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>COMMUNITY OUTREACH MESSAGE</p>
        <CopyButton text={data.message} />
      </div>

      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
            color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4,
            backgroundColor: 'var(--surface-input)',
          }}>Tone: {data.tone}</span>
        </div>

        <div className="rounded-[12px]" style={{ padding: '20px 24px', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--divider-light)' }}>
          <EditableText
            value={data.message}
            onChange={(v) => onChange({ ...data, message: v })}
            multiline
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}
          />
        </div>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 12 }}>
        Replace [SURVEY_LINK] with your actual survey URL before sharing.
      </p>
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
            <div
              key={i}
              className="rounded-[12px] p-5 transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-card)',
                boxShadow: isHov ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                transform: isHov ? 'translateY(-1px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredId(i)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center justify-between mb-3">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', textDecoration: 'none' }}
                >
                  {c.name}
                </a>
                <span className="rounded-full px-2 py-0.5" style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
                  backgroundColor: platformColor, color: '#fff',
                }}>{c.platform}</span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginBottom: 6 }}>
                {c.members} members
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {c.rationale}
              </p>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 rounded-[6px] px-3 py-1.5 transition-all duration-200"
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400,
                  color: 'var(--text-muted)', backgroundColor: 'var(--surface-input)',
                  textDecoration: 'none', border: 'none',
                }}
              >
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

function ScorecardSection({ data, onUpdate }: { data: ScorecardMetric[]; onUpdate: (id: string, actual: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>VALIDATION SCORECARD</p>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>Track your progress</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {data.map((m) => {
          const pct = m.target > 0 ? Math.min((m.actual / m.target) * 100, 100) : 0;
          const barColor = pct >= 100 ? '#2D8B75' : pct >= 50 ? '#D4880F' : 'var(--divider-light)';

          return (
            <div key={m.id} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{m.label}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>Target: {m.target_label}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <input
                  type="number"
                  value={m.actual || ''}
                  onChange={(e) => onUpdate(m.id, Number(e.target.value) || 0)}
                  placeholder="0"
                  style={{
                    width: 72, padding: '7px 10px', borderRadius: 8,
                    border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-bg)',
                    fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400,
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.06)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider-light)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
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

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 16 }}>
        Update metrics as you collect data. Save to persist progress to your dashboard.
      </p>
    </div>
  );
}
