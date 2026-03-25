import { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Scanning Reddit threads', detail: 'Searching r/startups, r/smallbusiness, r/entrepreneur...' },
  { label: 'Analyzing Google results', detail: 'Pulling reviews, articles, and market reports...' },
  { label: 'Extracting customer signals', detail: 'Identifying pain points, workarounds, and demand signals...' },
  { label: 'Building source index', detail: 'Linking every insight to its original source...' },
  { label: 'Scoring and ranking', detail: 'Calculating frequency, severity, and willingness-to-pay...' },
];

export default function DiscoverLoading() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 0.8, 92));
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="py-16">
      <div className="text-center mb-10">
        <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
          Gathering real customer evidence
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Every insight will be linked to its original source
        </p>
      </div>

      <div className="mx-auto mb-10" style={{ maxWidth: 400 }}>
        <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider)' }}>
          <div className="rounded-full h-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-teal))', transition: 'width 300ms ease-out', boxShadow: '0 0 10px rgba(0,212,230,0.3)' }} />
        </div>
        <div className="flex justify-between mt-3">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Analyzing sources</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="mx-auto flex flex-col gap-1" style={{ maxWidth: 400 }}>
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          const isPending = i > activeStep;
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all duration-300"
              style={{
                opacity: isPending ? 0.3 : 1,
                backgroundColor: isActive ? 'var(--surface-card)' : 'transparent',
                border: isActive ? '1px solid var(--divider)' : '1px solid transparent',
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isDone ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="var(--accent-primary)" strokeWidth="1.5" />
                    <path d="M5 8L7 10L11 6" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div className="rounded-full" style={{ width: 16, height: 16, border: '2px solid var(--divider-section)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <div className="rounded-full" style={{ width: 16, height: 16, border: '1.5px solid var(--divider-section)' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isDone ? 'var(--accent-primary)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  lineHeight: 1.4,
                }}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="animate-fade-in" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 3 }}>
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-10 space-y-3" style={{ maxWidth: 600 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl p-5 flex items-start gap-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', animationDelay: `${i * 150}ms` }}>
            <div className="animate-pulse rounded-full flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: 'var(--divider)' }} />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="animate-pulse rounded" style={{ width: 60, height: 16, backgroundColor: 'var(--divider)' }} />
                <div className="animate-pulse rounded" style={{ width: 48, height: 16, backgroundColor: 'var(--divider)' }} />
              </div>
              <div className="animate-pulse rounded" style={{ width: '85%', height: 14, backgroundColor: 'var(--divider)' }} />
              <div className="animate-pulse rounded" style={{ width: '60%', height: 12, backgroundColor: 'var(--divider)' }} />
              <div className="flex gap-3 mt-1">
                {[0, 1, 2, 3].map(j => (
                  <div key={j} className="animate-pulse rounded" style={{ flex: 1, height: 4, backgroundColor: 'var(--divider)' }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
