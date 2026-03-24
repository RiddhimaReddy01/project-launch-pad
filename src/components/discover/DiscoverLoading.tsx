import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const STEPS = [
  { label: 'Fetching Reddit posts' },
  { label: 'Scraping reviews' },
  { label: 'Clustering pain points' },
  { label: 'Extracting insights' },
];

export default function DiscoverLoading() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1.2, 95));
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-20">
      <div className="text-center">
        <p className="font-heading" style={{ fontSize: 22 }}>
          Scanning real customer discussions...
        </p>
        <p className="font-caption mt-3" style={{ fontSize: 13 }}>
          Analyzing Reddit threads, reviews, and search results (200+ sources)
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-full overflow-hidden" style={{ width: 320, height: 4, backgroundColor: 'var(--divider-light)' }}>
        <div className="rounded-full h-full transition-all duration-300 ease-out" style={{ width: `${progress}%`, backgroundColor: 'var(--accent-primary)' }} />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3" style={{ width: 280 }}>
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div key={i} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: i <= activeStep ? 1 : 0.3 }}>
              <span style={{ fontSize: 12, width: 20, textAlign: 'center', fontFamily: "'Outfit', sans-serif", color: isDone ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                {isDone ? '/' : (i + 1)}
              </span>
              <span style={{
                fontFamily: "'Outfit', sans-serif", fontSize: 13,
                fontWeight: isActive ? 400 : 300,
                color: isDone ? 'var(--accent-teal)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {step.label}
              </span>
              {isActive && (
                <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: 'var(--accent-primary)', animation: 'pulse 1.2s ease-in-out infinite' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Skeleton preview */}
      <div className="w-full max-w-lg mt-4 space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-16 w-3/4 rounded-lg" />
      </div>
    </div>
  );
}
