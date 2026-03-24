import { useIdea, type Step } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import UnderstandModule from '@/components/understand/UnderstandModule';
import DiscoverModule from '@/components/discover/DiscoverModule';
import AnalyzeModule from '@/components/analyze/AnalyzeModule';
import SetupModule from '@/components/setup/SetupModule';
import ValidateModule from '@/components/validate/ValidateModule';
import { saveIdea } from '@/lib/saved-ideas';
import { usePrefetch } from '@/hooks/use-prefetch';

const STEPS: { key: Step; label: string }[] = [
  { key: 'understand', label: 'Understand' },
  { key: 'discover', label: 'Discover' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'setup', label: 'Setup' },
  { key: 'validate', label: 'Validate' },
];

function StepperDot({ step, index, currentIndex, onNavigate, locked }: { step: typeof STEPS[number]; index: number; currentIndex: number; onNavigate: (step: Step) => void; locked: boolean }) {
  const isActive = index === currentIndex;
  const isCompleted = index < currentIndex;
  const isFuture = index > currentIndex;

  const dotColor = isCompleted || isActive ? 'var(--accent-primary)' : 'var(--divider-light)';

  return (
    <div
      className="flex flex-col items-center"
      style={{
        opacity: locked ? 0.35 : isFuture ? 0.55 : 1,
        transition: 'opacity 300ms ease-out',
        cursor: locked ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !locked && onNavigate(step.key)}
      title={locked ? 'Complete Discover first' : ''}
    >
      <div
        style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: isCompleted ? 'var(--accent-primary)' : 'transparent',
          border: `2px solid ${dotColor}`,
          transition: 'all 300ms ease-out',
        }}
      />
      <span
        style={{
          marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 12,
          fontWeight: isActive ? 400 : 300,
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'all 300ms ease-out',
        }}
      >
        {step.label}
      </span>
    </div>
  );
}

export default function Research() {
  const { idea, currentStep, setCurrentStep, discoverResult, prefetchStatus } = useIdea();
  const { user } = useAuth();

  // Fire parallel prefetch for all tabs after decompose completes
  usePrefetch();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Tabs after Discover require discoverResult
  const isTabLocked = (step: Step): boolean => {
    if (step === 'understand' || step === 'discover') return false;
    return !discoverResult;
  };

  const handleNavigate = (step: Step) => {
    if (isTabLocked(step)) return;
    setCurrentStep(step);
  };

  useEffect(() => {
    if (!idea && currentStep !== 'understand') navigate('/', { replace: true });
  }, [idea, navigate, currentStep]);

  useEffect(() => {
    const el = contentRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, [currentStep]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6" style={{ height: 64 }}>
        <span className="cursor-pointer" style={{ fontSize: 18 }} onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
        </span>
        <div className="flex items-center" style={{ gap: 24 }}>
          <span
            className="cursor-pointer transition-colors duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            onClick={() => navigate('/')}
          >
            New idea
          </span>
          {user && (
            <span
              className="cursor-pointer transition-colors duration-200"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              onClick={async () => {
                setSaveStatus('saving');
                await saveIdea(idea, currentStep);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save'}
            </span>
          )}
          <span
            className="cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
          >
            {user ? 'Dashboard' : 'Log in'}
          </span>
        </div>
      </header>

      {/* Context strip */}
      {currentStep !== 'understand' && idea && (
        <div
          className="sticky z-40"
          style={{ top: 0, backdropFilter: 'blur(16px)', backgroundColor: 'rgba(250,250,248,0.85)', padding: '20px 24px', textAlign: 'center' }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 6 }}>
            Your idea
          </p>
          <p className="font-heading" style={{ fontSize: 26, maxWidth: 600, margin: '0 auto', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            {idea}
          </p>
        </div>
      )}

      {/* Stepper */}
      <div style={{ maxWidth: 520, margin: '48px auto 0', padding: '0 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 5, left: '10%', right: '10%', height: 1, backgroundColor: 'var(--divider-light)' }} />
        <div style={{
          position: 'absolute', top: 5, left: '10%',
          width: `${(currentIndex / (STEPS.length - 1)) * 80}%`,
          height: 1, backgroundColor: 'var(--accent-primary)', transition: 'width 500ms ease-out',
        }} />
        <div className="relative flex items-start justify-between">
          {STEPS.map((step, i) => (
            <StepperDot key={step.key} step={step} index={i} currentIndex={currentIndex} onNavigate={handleNavigate} locked={isTabLocked(step.key)} />
          ))}
        </div>
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        key={currentStep}
        className="scroll-reveal"
        style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 160px' }}
      >
        {currentStep === 'understand' ? (
          <UnderstandModule />
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
    </div>
  );
}
