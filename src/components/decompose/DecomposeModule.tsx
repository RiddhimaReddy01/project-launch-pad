import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { decomposeIdea, type DecomposeResult } from '@/lib/decompose';

type Status = 'idle' | 'stage1' | 'stage2' | 'done' | 'error';

export default function DecomposeModule() {
  const { idea, setDecomposeResult } = useIdea();
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => el.classList.add('visible'));
  }, []);

  // Auto-run decompose when the module mounts with an idea
  useEffect(() => {
    if (idea && !hasRun.current) {
      hasRun.current = true;
      runDecompose();
    }
  }, [idea]);

  const runDecompose = async () => {
    if (!idea || idea.trim().split(/\s+/).length < 3) {
      setError('Please enter at least 3 words to describe your idea.');
      setStatus('error');
      return;
    }

    setError(null);
    setStatus('stage1');

    try {
      // Simulate stage progression for UX
      const timer = setTimeout(() => setStatus('stage2'), 2000);
      const data = await decomposeIdea(idea);
      clearTimeout(timer);

      setResult(data);
      setDecomposeResult(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  const isLoading = status === 'stage1' || status === 'stage2';

  return (
    <div ref={containerRef} className="scroll-reveal" style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div className="text-center mb-12">
        <p className="font-heading" style={{ fontSize: 26 }}>
          Decomposing your idea
        </p>
        <p className="font-caption mt-3" style={{ fontSize: 13 }}>
          Breaking down your business idea into searchable components using AI
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="relative">
            <div
              className="rounded-full"
              style={{
                width: 48,
                height: 48,
                border: '2px solid var(--divider-light)',
                borderTopColor: 'var(--accent-purple)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
          <div className="text-center">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
              {status === 'stage1' ? 'Extracting business type & location...' : 'Analyzing target market & sources...'}
            </p>
            <p className="font-caption mt-2" style={{ fontSize: 12 }}>
              {status === 'stage1' ? 'Stage 1 of 2' : 'Stage 2 of 2'}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="text-center py-12">
          <div
            className="rounded-[12px] p-6 mb-4 inline-block"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)' }}
          >
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'var(--destructive)' }}>
              {error}
            </p>
          </div>
          <div>
            <button
              onClick={runDecompose}
              className="rounded-[12px] px-5 py-3 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 400,
                backgroundColor: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="flex flex-col gap-6">
          {/* Cached indicator */}
          {result.cached && (
            <div className="flex justify-center">
              <span
                className="rounded-full px-3 py-1"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 400,
                  backgroundColor: 'rgba(45,139,117,0.08)',
                  color: 'var(--accent-teal)',
                  letterSpacing: '0.02em',
                }}
              >
                ⚡ Cached result
              </span>
            </div>
          )}

          {/* Business Type & Location */}
          <div
            className="rounded-[14px] p-6"
            style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>BUSINESS TYPE</p>
            <p className="font-heading" style={{ fontSize: 20, marginBottom: 12 }}>
              {result.stage1.business_type}
            </p>
            {(result.stage1.location.city || result.stage1.location.state) && (
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--text-secondary)' }}>
                  📍 {[result.stage1.location.city, result.stage1.location.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Target Customers */}
          <div
            className="rounded-[14px] p-6"
            style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>TARGET CUSTOMERS</p>
            <div className="flex flex-wrap gap-2">
              {result.stage2.target_customers.map((c, i) => (
                <span
                  key={i}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 300,
                    backgroundColor: 'rgba(108,92,231,0.06)',
                    color: 'var(--accent-purple)',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 400,
                  backgroundColor: 'rgba(212,136,15,0.08)',
                  color: 'var(--accent-amber)',
                }}
              >
                {result.stage2.price_tier}
              </span>
            </div>
          </div>

          {/* Search Queries */}
          <div
            className="rounded-[14px] p-6"
            style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>SEARCH QUERIES</p>
            <div className="flex flex-col gap-2">
              {result.stage2.search_queries.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[10px] px-4 py-2.5"
                  style={{ backgroundColor: 'var(--surface-input)' }}
                >
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>
                    🔍
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-primary)' }}>
                    {q}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources & Subreddits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="rounded-[14px] p-6"
              style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>SOURCE DOMAINS</p>
              <div className="flex flex-col gap-1.5">
                {result.stage2.source_domains.map((d, i) => (
                  <span
                    key={i}
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="rounded-[14px] p-6"
              style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="font-caption mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>SUBREDDITS</p>
              <div className="flex flex-wrap gap-2">
                {result.stage2.subreddits.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      fontWeight: 300,
                      backgroundColor: 'rgba(59,130,246,0.06)',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    r/{s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
