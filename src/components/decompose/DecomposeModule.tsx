import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { decomposeIdea, type DecomposeResult } from '@/lib/decompose';

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function DecomposeModule() {
  const { idea, setDecomposeResult, decomposeResult } = useIdea();
  const [status, setStatus] = useState<Status>(decomposeResult ? 'done' : 'idle');
  const [result, setResult] = useState<DecomposeResult | null>(decomposeResult);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(!!decomposeResult);

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
    setStatus('loading');
    try {
      const data = await decomposeIdea(idea);
      setResult(data);
      setDecomposeResult(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  // Loading — compact inline
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-6">
        <div
          className="rounded-full"
          style={{
            width: 18,
            height: 18,
            border: '2px solid var(--divider-light)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}>
          Analyzing your idea…
        </span>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center gap-4 py-6">
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--destructive)' }}>
          {error}
        </span>
        <button
          onClick={() => { hasRun.current = false; runDecompose(); }}
          className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Done — slim context strip (no internal details)
  if (status === 'done' && result) {
    const loc = [result.stage1.location.city, result.stage1.location.state].filter(Boolean).join(', ');
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <span style={{ fontSize: 14 }}>✓</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
            {result.stage1.business_type}
          </span>
          {loc && (
            <>
              <span style={{ color: 'var(--divider-light)' }}>·</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>
                {loc}
              </span>
            </>
          )}
          {result.stage2.price_tier && (
            <>
              <span style={{ color: 'var(--divider-light)' }}>·</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 400,
                  backgroundColor: 'rgba(212,136,15,0.08)',
                  color: 'var(--accent-amber)',
                }}
              >
                {result.stage2.price_tier}
              </span>
            </>
          )}
          {result.cached && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--accent-teal)' }}>
              ⚡ cached
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
