import { useIdea, type Step } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { decomposeIdea } from '@/lib/decompose';
import DiscoverModule from '@/components/discover/DiscoverModule';
import AnalyzeModule from '@/components/analyze/AnalyzeModule';
import SetupModule from '@/components/setup/SetupModule';
import ValidateModule from '@/components/validate/ValidateModule';
import { saveIdea } from '@/lib/saved-ideas';
import { usePrefetch } from '@/hooks/use-prefetch';

const STEPS: { key: Step; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'setup', label: 'Setup' },
  { key: 'validate', label: 'Validate' },
];

function StepperDot({ step, index, currentIndex, onNavigate, locked }: { step: typeof STEPS[number]; index: number; currentIndex: number; onNavigate: (step: Step) => void; locked: boolean }) {
  const isActive = index === currentIndex;
  const isCompleted = index < currentIndex;
  const isFuture = index > currentIndex;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        opacity: locked ? 0.3 : isFuture ? 0.5 : 1,
        transition: 'opacity 300ms ease-out',
        cursor: locked ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !locked && onNavigate(step.key)}
      title={locked ? 'Complete Discover first' : ''}
    >
      <div
        style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: isCompleted ? 'var(--accent-primary)' : isActive ? 'var(--accent-primary)' : 'transparent',
          border: `2px solid ${isCompleted || isActive ? 'var(--accent-primary)' : 'var(--divider-section)'}`,
          boxShadow: isActive ? '0 0 12px rgba(0,212,230,0.4)' : 'none',
          transition: 'all 300ms ease-out',
        }}
      />
      <span
        style={{
          marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 12,
          fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
          transition: 'all 300ms ease-out',
        }}
      >
        {step.label}
      </span>
    </div>
  );
}

export default function Research() {
  const { idea, currentStep, setCurrentStep, decomposeResult, setDecomposeResult, discoverResult, prefetchStatus } = useIdea();
  const { user } = useAuth();

  // Auto-decompose silently when idea is set
  const hasDecomposed = useRef(false);
  useEffect(() => {
    if (idea && !decomposeResult && !hasDecomposed.current) {
      hasDecomposed.current = true;
      decomposeIdea(idea).then(setDecomposeResult).catch(err => {
        console.warn('[Research] Auto-decompose failed:', err.message);
      });
    }
  }, [idea, decomposeResult, setDecomposeResult]);

  // Fire parallel prefetch for all tabs after decompose completes
  usePrefetch();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Tabs after Discover require discoverResult
  const isTabLocked = (step: Step): boolean => {
    if (step === 'discover') return false;
    return !discoverResult;
  };

  const handleNavigate = (step: Step) => {
    if (isTabLocked(step)) return;
    setCurrentStep(step);
  };

  useEffect(() => {
    if (!idea) navigate('/', { replace: true });
  }, [idea, navigate]);

  useEffect(() => {
    const el = contentRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, [currentStep]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      {/* Top bar */}
      <header className="glass flex items-center justify-between px-6 sticky top-0 z-50" style={{ height: 56 }}>
        <span className="cursor-pointer flex items-center gap-1.5" onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>Launch</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 17, color: 'var(--accent-primary)' }}>Lean</span>
        </span>
        <div className="flex items-center" style={{ gap: 20 }}>
          <span
            className="cursor-pointer transition-colors duration-200"
            style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            onClick={() => navigate('/')}
          >
            New idea
          </span>
          {user && (
            <span
              className="cursor-pointer transition-colors duration-200"
              style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}
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
            style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
          >
            {user ? 'Dashboard' : 'Log in'}
          </span>
        </div>
      </header>

      {/* Context strip */}
      {idea && (
        <div className="glass sticky z-40" style={{ top: 56, padding: '16px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Researching
          </p>
          <p className="font-heading" style={{ fontSize: 22, maxWidth: 600, margin: '0 auto', lineHeight: 1.25 }}>
            {idea}
          </p>
        </div>
      )}

      {/* Stepper */}
      <div style={{ maxWidth: 420, margin: '40px auto 0', padding: '0 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 5, left: '10%', right: '10%', height: 1, backgroundColor: 'var(--divider)' }} />
        <div style={{
          position: 'absolute', top: 5, left: '10%',
          width: `${(currentIndex / (STEPS.length - 1)) * 80}%`,
          height: 1, 
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-purple))',
          boxShadow: '0 0 8px rgba(0,212,230,0.3)',
          transition: 'width 500ms ease-out',
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
        style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 160px' }}
      >
        {currentStep === 'discover' ? (
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
