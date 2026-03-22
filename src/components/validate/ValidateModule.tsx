import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { MOCK_METRICS, MOCK_COMMUNITIES, MOCK_METHODS, MOCK_LANDING_PAGE, MOCK_SURVEY, MOCK_SOCIAL_OUTREACH, MOCK_MARKETPLACE, MOCK_DIRECT_OUTREACH } from '@/data/validate-mock';
import { saveIdea, saveExperiment } from '@/lib/saved-ideas';
import type { ValidationMethod } from '@/data/validate-mock';

type Verdict = 'awaiting' | 'go' | 'pivot' | 'kill';

const METHOD_GUIDES: Record<string, { steps: string[]; tips: string[] }> = {
  landing: {
    steps: ['Create a simple one-page site with your value proposition', 'Add an email signup form', 'Drive traffic via social media or paid ads', 'Measure signup conversion rate over 1-2 weeks'],
    tips: ['Use Carrd, Typedream, or Framer for a quick build', 'Keep the page under 30 seconds to read', 'A/B test your headline if possible'],
  },
  survey: {
    steps: ['Write 5-9 targeted questions about the pain point', 'Share the survey in relevant communities', 'Collect at least 50 responses', 'Analyze patterns in open-ended answers'],
    tips: ['Use Google Forms or Typeform', 'Keep it under 3 minutes to complete', 'Offer a small incentive for completion'],
  },
  social: {
    steps: ['Identify 3-5 relevant online communities', 'Craft a genuine, non-spammy post about the problem', 'Engage with every comment and DM', 'Track engagement metrics (likes, comments, DMs)'],
    tips: ['Lead with the problem, not your solution', 'Ask questions to spark discussion', 'Be transparent that you are exploring the idea'],
  },
  marketplace: {
    steps: ['Create a listing describing your offering', 'Set a competitive price point', 'Post on 2-3 platforms simultaneously', 'Track inquiries and conversion rate'],
    tips: ['Use real photos if possible', 'Respond within 1 hour to inquiries', 'Test different price points across platforms'],
  },
  direct: {
    steps: ['Build a list of 20-30 potential customers', 'Craft a personalized outreach message', 'Follow up within 48 hours if no response', 'Track response and meeting rates'],
    tips: ['Research each prospect before reaching out', 'Lead with value, not a pitch', 'Ask for feedback even if they say no'],
  },
};

export default function ValidateModule() {
  const { idea, selectedInsight, currentStep } = useIdea();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState(MOCK_METRICS.map((m) => ({ ...m })));
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [sharedChannels, setSharedChannels] = useState<Set<string>>(new Set());
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  const updateMetric = (id: string, val: number) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, actual: val } : m)));
  };

  const toggleChannel = (id: string) => {
    setSharedChannels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentMethod = MOCK_METHODS.find(m => m.id === selectedMethod);
  const guide = selectedMethod ? METHOD_GUIDES[selectedMethod] : null;

  const getAssets = (methodId: string) => {
    switch (methodId) {
      case 'landing': return { type: 'Landing Page', data: MOCK_LANDING_PAGE };
      case 'survey': return { type: 'Survey', data: MOCK_SURVEY };
      case 'social': return { type: 'Social Post', data: MOCK_SOCIAL_OUTREACH };
      case 'marketplace': return { type: 'Listing', data: MOCK_MARKETPLACE };
      case 'direct': return { type: 'Outreach', data: MOCK_DIRECT_OUTREACH };
      default: return null;
    }
  };

  const { verdict, reasoning } = useMemo(() => {
    const signups = metrics.find((m) => m.id === 'signups')?.actual || 0;
    const switchRate = metrics.find((m) => m.id === 'switch')?.actual || 0;
    const price = metrics.find((m) => m.id === 'price')?.actual || 0;
    const hasData = signups > 0 || switchRate > 0 || price > 0;

    if (!hasData) return { verdict: 'awaiting' as Verdict, reasoning: 'Enter your experiment results to get a recommendation.' };
    if (signups >= 150 && switchRate >= 60 && price >= 8)
      return { verdict: 'go' as Verdict, reasoning: 'Strong demand signal with healthy price tolerance. Move forward with confidence.' };
    if (signups < 30 && switchRate < 30)
      return { verdict: 'kill' as Verdict, reasoning: 'Low interest across channels. Consider a fundamentally different value proposition.' };
    if (signups >= 80 && switchRate >= 40)
      return { verdict: 'pivot' as Verdict, reasoning: 'Moderate interest — refine positioning, adjust pricing, or narrow the segment.' };
    if (price < 6 && signups > 50)
      return { verdict: 'pivot' as Verdict, reasoning: 'Strong interest but low price tolerance — consider repositioning pricing.' };
    return { verdict: 'pivot' as Verdict, reasoning: 'Mixed signals. Some interest exists but key metrics need improvement.' };
  }, [metrics]);

  const signupsVal = metrics.find((m) => m.id === 'signups')?.actual || 0;
  const switchVal = metrics.find((m) => m.id === 'switch')?.actual || 0;
  const priceVal = metrics.find((m) => m.id === 'price')?.actual || 0;
  const demandStrength = signupsVal >= 100 ? 'High' : signupsVal >= 50 ? 'Medium' : 'Low';
  const priceAcceptance = priceVal >= 10 ? 'Strong' : priceVal >= 7 ? 'Moderate' : 'Weak';
  const conversionEst = signupsVal > 0 ? Math.round((switchVal / 100) * signupsVal) : 0;

  const verdictConfig: Record<Verdict, { label: string; color: string; bg: string }> = {
    awaiting: { label: 'Awaiting data', color: 'var(--text-muted)', bg: 'var(--surface-input)' },
    go: { label: 'GO', color: '#2D8B75', bg: 'rgba(45,139,117,0.06)' },
    pivot: { label: 'PIVOT', color: '#D4880F', bg: 'rgba(212,136,15,0.06)' },
    kill: { label: 'NOT WORTH IT', color: '#E05252', bg: 'rgba(224,82,82,0.06)' },
  };
  const vc = verdictConfig[verdict];
  const insightTitle = selectedInsight || 'Existing juice bars are overpriced for basic smoothies';

  const handleSave = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSaving(true);
    const metricsObj = Object.fromEntries(metrics.map(m => [m.id, m.actual]));
    const result = await saveIdea(idea, currentStep, {
      validate: { metrics: metricsObj, selectedMethod, verdict, channels: Array.from(sharedChannels) },
    });

    if (result.id && selectedMethod && currentMethod) {
      await saveExperiment(result.id, { id: selectedMethod, name: currentMethod.name }, metricsObj);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
      {/* Context strip */}
      <div
        className="sticky z-30 rounded-[12px] mb-12 p-5"
        style={{ top: 80, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 4 }}>IDEA</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.4 }}>{idea}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 4 }}>TESTING</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.4 }}>{insightTitle}</p>
          </div>
          <div>
            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 4 }}>METHOD</p>
            <div className="flex items-center justify-center rounded-[8px]" style={{ minWidth: 40, height: 40, padding: '0 12px', backgroundColor: 'rgba(108,92,231,0.06)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--accent-purple)' }}>
              {currentMethod?.name || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="mb-12">
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 10 }}>DEMAND VALIDATION</p>
        <p className="font-heading" style={{ fontSize: 26, marginBottom: 12 }}>Will people actually pay for this?</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 300, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 540 }}>
          Pick a validation method, follow the guide, generate starter assets, and track real responses.
        </p>
      </div>

      {/* Verdict */}
      <div className="rounded-[16px] mb-16 text-center" style={{ padding: 40, backgroundColor: vc.bg }}>
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.08em', marginBottom: 14 }}>VERDICT</p>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, fontWeight: 400, color: vc.color, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 16 }}>{vc.label}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 480, margin: '0 auto' }}>{reasoning}</p>
      </div>

      {/* Metrics */}
      <div className="mb-16">
        <p className="font-caption mb-5" style={{ fontSize: 11, letterSpacing: '0.06em' }}>EXPERIMENT METRICS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {metrics.map((m) => {
            const pct = Math.min((m.actual / m.target) * 100, 100);
            const barColor = pct >= 100 ? '#2D8B75' : pct >= 50 ? '#D4880F' : 'var(--divider-light)';
            const isHov = hoveredMetric === m.id;
            return (
              <div key={m.id} className="rounded-[12px] p-5 transition-all duration-200" style={{ backgroundColor: 'var(--surface-card)', boxShadow: isHov ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)', transform: isHov ? 'translateY(-2px)' : 'translateY(0)' }} onMouseEnter={() => setHoveredMetric(m.id)} onMouseLeave={() => setHoveredMetric(null)}>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{m.label}</span>
                  <span className="font-caption" style={{ fontSize: 12 }}>Target: {m.targetLabel}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input type="number" value={m.actual || ''} onChange={(e) => updateMetric(m.id, Number(e.target.value) || 0)} placeholder="0" style={{ width: 72, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-bg)', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.08)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider-light)'; e.currentTarget.style.boxShadow = 'none'; }} />
                  <span className="font-caption" style={{ fontSize: 12 }}>{m.unit}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 2, transition: 'width 300ms ease-out' }} />
                </div>
                <p className="font-caption mt-1.5" style={{ fontSize: 11, textAlign: 'right' }}>{Math.round(pct)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived signals */}
      <div className="mb-16">
        <p className="font-caption mb-5" style={{ fontSize: 11, letterSpacing: '0.06em' }}>DERIVED SIGNALS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Demand strength', value: demandStrength, color: demandStrength === 'High' ? '#2D8B75' : demandStrength === 'Medium' ? '#D4880F' : '#E05252' },
            { label: 'Est. conversions', value: conversionEst.toString(), color: 'var(--text-primary)' },
            { label: 'Price acceptance', value: priceAcceptance, color: priceAcceptance === 'Strong' ? '#2D8B75' : priceAcceptance === 'Moderate' ? '#D4880F' : '#E05252' },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] p-5 text-center" style={{ backgroundColor: 'var(--surface-input)' }}>
              <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.05em', marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ VALIDATION METHOD DROPDOWN ═══ */}
      <div className="mb-16">
        <p className="font-caption mb-5" style={{ fontSize: 11, letterSpacing: '0.06em' }}>SELECT VALIDATION METHOD</p>
        
        {/* Custom dropdown */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full rounded-[12px] transition-all duration-200"
            style={{
              padding: '14px 16px',
              border: '1px solid var(--divider-light)',
              backgroundColor: 'var(--surface-card)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              color: currentMethod ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
            }}
          >
            <span>{currentMethod ? currentMethod.name : 'Choose a method...'}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease-out' }}>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="rounded-[12px]"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--surface-card)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {MOCK_METHODS.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setSelectedMethod(m.id); setDropdownOpen(false); setShowGuide(true); setShowAssets(false); }}
                  className="transition-all duration-150"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: selectedMethod === m.id ? 'rgba(108,92,231,0.04)' : 'transparent',
                    borderLeft: selectedMethod === m.id ? '3px solid var(--accent-purple)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(108,92,231,0.04)'; }}
                  onMouseLeave={e => { if (selectedMethod !== m.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 2 }}>{m.name}</p>
                  <p className="font-caption" style={{ fontSize: 12 }}>{m.description}</p>
                  <div className="flex items-center" style={{ gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: m.effort === 'low' ? '#2D8B75' : m.effort === 'medium' ? '#D4880F' : '#E05252' }}>{m.effort} effort</span>
                    <span className="font-caption" style={{ fontSize: 11 }}>· {m.speed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guide + Assets tabs */}
        {selectedMethod && (
          <div style={{ marginTop: 24 }}>
            <div className="flex" style={{ gap: 4, marginBottom: 20 }}>
              <button
                onClick={() => { setShowGuide(true); setShowAssets(false); }}
                className="rounded-[8px] px-4 py-2 transition-all duration-200"
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400,
                  backgroundColor: showGuide && !showAssets ? 'var(--accent-purple)' : 'var(--surface-input)',
                  color: showGuide && !showAssets ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                📋 How to implement
              </button>
              <button
                onClick={() => { setShowGuide(false); setShowAssets(true); }}
                className="rounded-[8px] px-4 py-2 transition-all duration-200"
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400,
                  backgroundColor: showAssets ? 'var(--accent-purple)' : 'var(--surface-input)',
                  color: showAssets ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                ✨ Generated assets
              </button>
            </div>

            {/* Guide content */}
            {showGuide && guide && (
              <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 16 }}>
                  How to run: {currentMethod?.name}
                </p>
                <div style={{ marginBottom: 20 }}>
                  <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.05em', marginBottom: 10 }}>STEPS</p>
                  {guide.steps.map((step, i) => (
                    <div key={i} className="flex" style={{ gap: 12, marginBottom: 10 }}>
                      <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: 24, height: 24, backgroundColor: 'rgba(108,92,231,0.08)', fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--accent-purple)' }}>
                        {i + 1}
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2 }}>{step}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.05em', marginBottom: 10 }}>TIPS</p>
                  {guide.tips.map((tip, i) => (
                    <div key={i} className="flex items-start" style={{ gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#2D8B75', fontSize: 12, marginTop: 2 }}>💡</span>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets content */}
            {showAssets && selectedMethod && (() => {
              const assets = getAssets(selectedMethod);
              if (!assets) return null;

              return (
                <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 16 }}>
                    Generated {assets.type}
                  </p>

                  {selectedMethod === 'landing' && (() => {
                    const d = assets.data as typeof MOCK_LANDING_PAGE;
                    return (
                      <div className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-input)' }}>
                        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>{d.headline}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 16 }}>{d.subheadline}</p>
                        <ul style={{ marginBottom: 16, paddingLeft: 0, listStyle: 'none' }}>
                          {d.benefits.map((b, i) => <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 6 }}>✓ {b}</li>)}
                        </ul>
                        <div className="rounded-[10px] inline-block" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-purple)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400 }}>{d.cta}</div>
                        <p className="font-caption" style={{ marginTop: 12, fontStyle: 'italic', fontSize: 12 }}>{d.socialProof}</p>
                      </div>
                    );
                  })()}

                  {selectedMethod === 'survey' && (() => {
                    const d = assets.data as typeof MOCK_SURVEY;
                    return (
                      <div className="flex flex-col" style={{ gap: 10 }}>
                        {d.map((q, i) => (
                          <div key={q.id} className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-input)' }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>Q{i + 1}. {q.question}</p>
                            <span className="font-caption" style={{ fontSize: 11 }}>{q.type}</span>
                            {q.options && <p className="font-caption" style={{ fontSize: 11, marginTop: 4 }}>Options: {q.options.join(', ')}</p>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {selectedMethod === 'social' && (() => {
                    const d = assets.data as typeof MOCK_SOCIAL_OUTREACH;
                    return (
                      <div className="rounded-[10px] p-5" style={{ backgroundColor: 'var(--surface-input)' }}>
                        <p className="font-caption" style={{ fontSize: 11, marginBottom: 8 }}>Tone: {d.tone}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{d.message}</p>
                      </div>
                    );
                  })()}

                  {selectedMethod === 'marketplace' && (() => {
                    const d = assets.data as typeof MOCK_MARKETPLACE;
                    return (
                      <div className="rounded-[10px] p-5" style={{ backgroundColor: 'var(--surface-input)' }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{d.title}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: '#2D8B75', marginBottom: 10 }}>{d.pricing}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>{d.description}</p>
                        <p className="font-caption" style={{ fontStyle: 'italic', fontSize: 12 }}>Hook: {d.hook}</p>
                      </div>
                    );
                  })()}

                  {selectedMethod === 'direct' && (() => {
                    const d = assets.data as typeof MOCK_DIRECT_OUTREACH;
                    return (
                      <div className="flex flex-col" style={{ gap: 10 }}>
                        {[{ label: 'Pitch Message', text: d.pitchMessage }, { label: 'Intro Script', text: d.introScript }, { label: 'Value Prop', text: d.valueProp }].map(item => (
                          <div key={item.label} className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-input)' }}>
                            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.05em', marginBottom: 6 }}>{item.label.toUpperCase()}</p>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.text}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="mb-16">
        <p className="font-caption mb-5" style={{ fontSize: 11, letterSpacing: '0.06em' }}>WHERE TO SHARE</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {MOCK_COMMUNITIES.map((c) => {
            const isShared = sharedChannels.has(c.id);
            const isHov = hoveredChannel === c.id;
            return (
              <div key={c.id} className="rounded-[12px] p-4 transition-all duration-200" style={{ backgroundColor: isShared ? 'rgba(45,139,117,0.04)' : 'var(--surface-card)', boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)', transform: isHov ? 'translateY(-1px)' : 'translateY(0)' }} onMouseEnter={() => setHoveredChannel(c.id)} onMouseLeave={() => setHoveredChannel(null)}>
                <div className="flex items-center justify-between mb-2">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--accent-purple)', textDecoration: 'none' }}>{c.name} ↗</a>
                  <span className="font-caption rounded-full px-2 py-0.5" style={{ fontSize: 10, backgroundColor: c.platformColor, color: '#fff' }}>{c.platform}</span>
                </div>
                <p className="font-caption" style={{ fontSize: 12, marginBottom: 6 }}>{c.members} members</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{c.rationale}</p>
                <button onClick={() => toggleChannel(c.id)} className="rounded-[8px] px-3 py-1.5 transition-all duration-200 active:scale-[0.97]" style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 400, backgroundColor: isShared ? 'rgba(45,139,117,0.08)' : 'var(--surface-input)', color: isShared ? '#2D8B75' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                  {isShared ? '✓ Shared' : 'Mark as shared'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-[14px] p-6 mb-12" style={{ backgroundColor: 'var(--surface-input)' }}>
        <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>EXPERIMENT SUMMARY</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
          {selectedMethod
            ? `Using ${currentMethod?.name} validation and shared across ${sharedChannels.size} channel${sharedChannels.size !== 1 ? 's' : ''}. ${verdict === 'go' ? 'Strong signals — this idea is worth pursuing.' : verdict === 'kill' ? 'Weak signals — consider pivoting.' : verdict === 'pivot' ? 'Mixed signals — refine your positioning.' : 'Enter your results above to see a recommendation.'}`
            : 'Select a validation method above to get started.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-8" style={{ borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[12px] px-6 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400,
            backgroundColor: saved ? '#2D8B75' : 'var(--accent-purple)', color: '#FFFFFF',
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!saved) (e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,92,231,0.3)'); }}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : user ? 'Save validation results' : 'Sign in to save'}
        </button>
        <button
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, backgroundColor: 'rgba(108,92,231,0.06)', color: 'var(--accent-purple)', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(108,92,231,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(108,92,231,0.06)')}
        >
          Export report
        </button>
        <button
          onClick={() => navigate('/')}
          className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--divider-light)', cursor: 'pointer' }}
        >
          Start new idea
        </button>
      </div>
    </div>
  );
}
