import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { decomposeIdea } from '@/lib/decompose';
import { useIdea, type Step } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { usePrefetch } from '@/hooks/use-prefetch';
import { saveIdea } from '@/lib/saved-ideas';
import DiscoverModule from '@/components/discover/DiscoverModule';
import AnalyzeModule from '@/components/analyze/AnalyzeModule';
import SetupModule from '@/components/setup/SetupModule';
import ValidateModule from '@/components/validate/ValidateModule';

const STEPS: { key: Step; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'setup', label: 'Setup' },
  { key: 'validate', label: 'Validate' },
];

function StepperDot({
  step,
  index,
  currentIndex,
  onNavigate,
  locked,
  hasData,
}: {
  step: typeof STEPS[number];
  index: number;
  currentIndex: number;
  onNavigate: (step: Step) => void;
  locked: boolean;
  hasData: boolean;
}) {
  const isActive = index === currentIndex;
  const isCompleted = index < currentIndex;

  const dotColor = (isCompleted || isActive)
    ? 'var(--color-accent)'
    : hasData
      ? 'var(--accent-teal)'
      : 'var(--color-border)';

  const statusLabel = isActive
    ? `${step.label} — current step`
    : hasData
      ? `${step.label} — data loaded`
      : locked
        ? `${step.label} — locked, complete Discover first`
        : step.label;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={statusLabel}
      aria-disabled={locked}
      tabIndex={locked ? -1 : 0}
      style={{
        opacity: locked ? 0.35 : 1,
        transition: 'opacity 220ms ease-out',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        background: 'none',
        border: 'none',
        padding: '4px 8px',
      }}
      onClick={() => !locked && onNavigate(step.key)}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !locked) { e.preventDefault(); onNavigate(step.key); } }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          margin: '0 auto',
          backgroundColor: dotColor,
          border: `2px solid ${dotColor}`,
          transition: 'all 300ms ease',
          position: 'relative',
        }}
      >
        {hasData && !isActive && !isCompleted && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 6, height: 6, borderRadius: 999,
            background: 'var(--accent-teal)',
            border: '1px solid var(--color-bg)',
          }} />
        )}
      </div>
      <span
        style={{
          display: 'block',
          marginTop: 10,
          fontSize: 12,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? 'var(--color-accent)' : isCompleted ? 'var(--color-text)' : 'var(--color-text-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {step.label}
      </span>
    </button>
  );
}

function ResearchTabLoading({ step }: { step: Step }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const copy: Record<Step, { label: string; title: string; body: string; est: string }> = {
    discover: {
      label: 'Discover',
      title: 'Collecting customer evidence',
      body: 'Pulling demand signals, pain points, and quoted evidence into a readable market brief.',
      est: '~15–30 seconds',
    },
    analyze: {
      label: 'Analyze',
      title: 'Shaping the commercial picture',
      body: 'Turning research into opportunity sizing, customer segments, competition, and funnel logic.',
      est: '~10–20 seconds',
    },
    setup: {
      label: 'Setup',
      title: 'Building the launch plan',
      body: 'Preparing costs, vendors, operating assumptions, and the first launch roadmap.',
      est: '~10–15 seconds',
    },
    validate: {
      label: 'Validate',
      title: 'Preparing the validation toolkit',
      body: 'Assembling the assets that help you test demand before committing deeper resources.',
      est: '~10–20 seconds',
    },
  };

  const current = copy[step];
  const minutes = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;

  return (
    <section className="rounded-2xl p-8" style={{ maxWidth: 760, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }} role="status" aria-live="polite" aria-label={`Loading ${current.label} data`}>
      <p className="eyebrow">{current.label}</p>
      <h2 className="section-title">{current.title}</h2>
      <p className="section-copy" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>{current.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', fontSize: 13, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: 'var(--color-accent)', animation: 'pulse 1.5s ease-in-out infinite' }} aria-hidden="true" />
        <span>Working — {elapsedStr} elapsed (typically {current.est})</span>
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {[100, 88, 72].map((width, index) => (
          <div key={index} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)' }}>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{
                width: `${width}%`, height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-soft) 50%, var(--color-accent) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s ease-in-out infinite',
              }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Research() {
  const {
    idea,
    currentStep,
    setCurrentStep,
    decomposeResult,
    setDecomposeResult,
    discoverResult,
    analyzeData,
    setupData,
    validateData,
    prefetchStatus,
  } = useIdea();
  const { user } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const hasDecomposed = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const pendingNavigation = useRef<string | null>(null);

  const hasUnsavedWork = !!(discoverResult || Object.keys(analyzeData).length > 0 || Object.keys(setupData).length > 0 || validateData);

  useEffect(() => {
    if (idea && !decomposeResult && !hasDecomposed.current) {
      hasDecomposed.current = true;
      decomposeIdea(idea).then(setDecomposeResult).catch((error) => {
        console.warn('[Research] Auto-decompose failed:', error.message);
      });
    }
  }, [idea, decomposeResult, setDecomposeResult]);

  usePrefetch();

  useEffect(() => {
    if (!idea) navigate('/', { replace: true });
  }, [idea, navigate]);

  useEffect(() => {
    const element = contentRef.current;
    if (element) requestAnimationFrame(() => element.classList.add('visible'));
  }, [currentStep]);

  useEffect(() => {
    const timer = window.setTimeout(() => setTabTransitioning(false), 260);
    return () => window.clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    if (!hasUnsavedWork) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedWork]);

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  const isTabLocked = (step: Step) => step !== 'discover' && !discoverResult;

  const stepHasData = (step: Step): boolean => {
    switch (step) {
      case 'discover': return !!discoverResult;
      case 'analyze': return Object.keys(analyzeData).length > 0;
      case 'setup': return Object.keys(setupData).length > 0;
      case 'validate': return !!validateData;
      default: return false;
    }
  };

  const handleNavigate = (step: Step) => {
    if (isTabLocked(step)) return;
    setTabTransitioning(true);
    setCurrentStep(step);
  };

  const handleNavAway = useCallback((path: string) => {
    if (hasUnsavedWork && saveStatus !== 'saved') {
      pendingNavigation.current = path;
      setShowUnsavedWarning(true);
    } else {
      navigate(path);
    }
  }, [hasUnsavedWork, saveStatus, navigate]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    await saveIdea(idea, currentStep, {
      decompose: decomposeResult || undefined,
      discover: discoverResult || undefined,
      analyze: Object.keys(analyzeData).length > 0 ? { decompose: decomposeResult, sections: analyzeData } : undefined,
      setup: Object.keys(setupData).length > 0 ? setupData : undefined,
      validate: validateData || undefined,
    });
    setSaveStatus('saved');
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [idea, currentStep, decomposeResult, discoverResult, analyzeData, setupData, validateData]);

  const showStepLoading =
    tabTransitioning ||
    (!decomposeResult && !!idea) ||
    (currentStep === 'analyze' && prefetchStatus === 'running' && Object.keys(analyzeData).length === 0) ||
    (currentStep === 'setup' && prefetchStatus === 'running' && !setupData?.costs);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Nav */}
      <header className="top-nav top-nav--compact" role="banner">
        <nav className="top-nav__inner" aria-label="Research navigation">
          <button type="button" className="brand-button" onClick={() => handleNavAway('/')} aria-label="Go to homepage">
            <span className="brand-mark" aria-label="LaunchLens home">
              <span className="brand-mark__strong">Launch</span>{' '}
              <span className="brand-mark__light">Lens</span>
            </span>
          </button>
          <div className="top-nav__actions" role="group" aria-label="Navigation actions">
            <button className="btn-secondary rounded-full px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => handleNavAway('/')} aria-label="Start a new idea">
              New idea
            </button>
            {user ? (
              <button
                className="btn-secondary rounded-full px-5 py-2.5"
                style={{ fontSize: 14, fontWeight: 600 }}
                onClick={handleSave}
                aria-label={saveStatus === 'saved' ? `Saved at ${savedAt}` : 'Save your research'}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? `Saved ${savedAt || ''}` : 'Save'}
              </button>
            ) : null}
            <button
              className="btn-primary rounded-full px-5 py-2.5"
              style={{ fontSize: 14, fontWeight: 600 }}
              onClick={() => handleNavAway(user ? '/dashboard' : '/auth')}
            >
              {user ? 'Dashboard' : 'Log in'}
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content" className="app-shell__content">
        {/* Idea header */}
        {idea ? (
          <section style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-8)', maxWidth: 760 }}>
            <p className="eyebrow">Research Workspace</p>
            <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>{idea}</h1>
            <p className="section-copy" style={{ margin: 0 }}>
              Move from market evidence to operating decisions in one continuous founder narrative.
            </p>
          </section>
        ) : null}

        {/* Stepper */}
        <section style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 'var(--space-8)', position: 'relative' }} aria-label="Research progress">
          <div style={{ position: 'absolute', top: 5, left: '10%', right: '10%', height: 1, backgroundColor: 'var(--color-border)' }} aria-hidden="true" />
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: '10%',
              width: `${(currentIndex / (STEPS.length - 1)) * 80}%`,
              height: 2,
              backgroundColor: 'var(--color-accent)',
              transition: 'width 500ms ease-out',
            }}
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between" role="tablist" aria-label="Research steps">
            {STEPS.map((step, index) => (
              <StepperDot
                key={step.key}
                step={step}
                index={index}
                currentIndex={currentIndex}
                onNavigate={handleNavigate}
                locked={isTabLocked(step.key)}
                hasData={stepHasData(step.key)}
              />
            ))}
          </div>
        </section>

        {/* Content */}
        <div ref={contentRef} key={currentStep} className="scroll-reveal" style={{ paddingBottom: 'var(--space-20)' }} role="tabpanel" aria-label={`${STEPS[currentIndex]?.label || ''} content`}>
          {showStepLoading ? (
            <ResearchTabLoading step={currentStep} />
          ) : currentStep === 'discover' ? (
            <DiscoverModule />
          ) : currentStep === 'analyze' ? (
            <AnalyzeModule />
          ) : currentStep === 'setup' ? (
            <SetupModule />
          ) : currentStep === 'validate' ? (
            <ValidateModule />
          ) : null}
        </div>
      </main>

      {showUnsavedWarning && (
        <div className="confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-desc">
          <div className="confirm-dialog">
            <h2 id="unsaved-title" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
              Unsaved research
            </h2>
            <p id="unsaved-desc" style={{ fontSize: 14, color: 'var(--color-text-soft)', lineHeight: 1.7, marginBottom: 24 }}>
              You have research in progress that hasn&apos;t been saved. Leave anyway or save first?
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn-secondary rounded-full px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => setShowUnsavedWarning(false)}>Cancel</button>
              <button className="btn-secondary rounded-full px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => { setShowUnsavedWarning(false); if (pendingNavigation.current) navigate(pendingNavigation.current); }}>
                Leave without saving
              </button>
              <button className="btn-primary rounded-full px-5 py-2.5" style={{ fontSize: 14, fontWeight: 600 }} onClick={async () => { await handleSave(); setShowUnsavedWarning(false); if (pendingNavigation.current) navigate(pendingNavigation.current); }}>
                Save &amp; leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
