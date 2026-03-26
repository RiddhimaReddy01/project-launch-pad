import { useEffect, useRef, useState } from 'react';
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
import { AppShell, PillButton, SecondaryButton, TopNav } from '@/components/system/editorial';

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
}: {
  step: typeof STEPS[number];
  index: number;
  currentIndex: number;
  onNavigate: (step: Step) => void;
  locked: boolean;
}) {
  const isActive = index === currentIndex;
  const isCompleted = index < currentIndex;

  return (
    <div
      style={{
        opacity: locked ? 0.45 : 1,
        transition: 'opacity 220ms ease-out',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'center',
      }}
      onClick={() => !locked && onNavigate(step.key)}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          margin: '0 auto',
          backgroundColor: isCompleted || isActive ? 'var(--color-accent)' : 'var(--color-surface)',
          border: `2px solid ${isCompleted || isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
      />
      <span
        style={{
          display: 'block',
          marginTop: 10,
          fontSize: 12,
          fontWeight: isActive ? 700 : 600,
          color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
        }}
      >
        {step.label}
      </span>
    </div>
  );
}

function ResearchTabLoading({ step }: { step: Step }) {
  const copy: Record<Step, { label: string; title: string; body: string }> = {
    discover: {
      label: 'Discover',
      title: 'Collecting customer evidence',
      body: 'Pulling demand signals, pain points, and quoted evidence into a readable market brief.',
    },
    analyze: {
      label: 'Analyze',
      title: 'Shaping the commercial picture',
      body: 'Turning research into opportunity sizing, customer segments, competition, and funnel logic.',
    },
    setup: {
      label: 'Setup',
      title: 'Building the launch plan',
      body: 'Preparing costs, vendors, operating assumptions, and the first launch roadmap.',
    },
    validate: {
      label: 'Validate',
      title: 'Preparing the validation toolkit',
      body: 'Assembling the assets that help you test demand before committing deeper resources.',
    },
  };

  const current = copy[step];

  return (
    <section className="section-card" style={{ maxWidth: 760 }}>
      <p className="eyebrow">{current.label}</p>
      <h2 className="section-title">{current.title}</h2>
      <p className="section-copy" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>{current.body}</p>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {[100, 88, 72].map((width, index) => (
          <div key={index} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)' }}>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(45, 38, 31, 0.08)', overflow: 'hidden' }}>
              <div className="animate-progress" style={{ width: `${width}%`, height: '100%', borderRadius: 999, background: 'var(--color-accent)' }} />
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
  const [tabTransitioning, setTabTransitioning] = useState(false);

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

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  const isTabLocked = (step: Step) => step !== 'discover' && !discoverResult;

  const handleNavigate = (step: Step) => {
    if (isTabLocked(step)) return;
    setTabTransitioning(true);
    setCurrentStep(step);
  };

  const showStepLoading =
    tabTransitioning ||
    (!decomposeResult && !!idea) ||
    (currentStep === 'analyze' && prefetchStatus === 'running' && Object.keys(analyzeData).length === 0) ||
    (currentStep === 'setup' && prefetchStatus === 'running' && !setupData?.costs);

  return (
    <AppShell
      nav={
        <TopNav
          compact
          rightSlot={
            <>
              <SecondaryButton onClick={() => navigate('/')}>New idea</SecondaryButton>
              {user ? (
                <SecondaryButton
                  onClick={async () => {
                    setSaveStatus('saving');
                    await saveIdea(idea, currentStep, {
                      decompose: decomposeResult || undefined,
                      discover: discoverResult || undefined,
                      analyze: Object.keys(analyzeData).length > 0 ? { decompose: decomposeResult, sections: analyzeData } : undefined,
                      setup: Object.keys(setupData).length > 0 ? setupData : undefined,
                      validate: validateData || undefined,
                    });
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                  }}
                >
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                </SecondaryButton>
              ) : null}
              <PillButton onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Dashboard' : 'Log in'}
              </PillButton>
            </>
          }
        />
      }
    >
      {idea ? (
        <section style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-8)', maxWidth: 760 }}>
          <p className="eyebrow">Research Workspace</p>
          <h1 className="section-title" style={{ fontSize: '2.4rem', marginBottom: 'var(--space-3)' }}>{idea}</h1>
          <p className="section-copy" style={{ margin: 0 }}>
            Move from market evidence to operating decisions in one continuous founder narrative.
          </p>
        </section>
      ) : null}

      <section style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 'var(--space-8)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 5, left: '10%', right: '10%', height: 1, backgroundColor: 'var(--color-border)' }} />
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: '10%',
            width: `${(currentIndex / (STEPS.length - 1)) * 80}%`,
            height: 1,
            backgroundColor: 'var(--color-accent)',
            transition: 'width 500ms ease-out',
          }}
        />
        <div className="relative flex items-start justify-between">
          {STEPS.map((step, index) => (
            <StepperDot
              key={step.key}
              step={step}
              index={index}
              currentIndex={currentIndex}
              onNavigate={handleNavigate}
              locked={isTabLocked(step.key)}
            />
          ))}
        </div>
      </section>

      <div ref={contentRef} key={currentStep} className="scroll-reveal" style={{ paddingBottom: 'var(--space-20)' }}>
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
    </AppShell>
  );
}

