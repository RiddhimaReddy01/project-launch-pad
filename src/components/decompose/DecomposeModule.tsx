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
    if (!idea || idea.trim().split(/\s+/).length < 2) {
      setError('Please enter at least 2 words to describe your idea.');
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
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}>
          Analyzing your idea...
        </span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center gap-4 py-6">
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'hsl(var(--destructive))' }}>
          {error}
        </span>
        <button
          onClick={() => { hasRun.current = false; runDecompose(); }}
          className="btn-primary rounded-[10px] px-4 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'done' && result) {
    const loc = [result.stage1.location.city, result.stage1.location.state].filter(Boolean).join(', ');
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="card-base flex items-center gap-2 rounded-full px-4 py-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7L6 10L11 4" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
            {result.stage1.business_type}
          </span>
          {loc && (
            <>
              <span style={{ color: 'var(--divider-light)' }}>/</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>
                {loc}
              </span>
            </>
          )}
          {result.stage2.price_tier && (
            <>
              <span style={{ color: 'var(--divider-light)' }}>/</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 11,
                  fontWeight: 400,
                  backgroundColor: 'rgba(45,107,82,0.08)',
                  color: 'var(--accent-primary)',
                }}
              >
                {result.stage2.price_tier}
              </span>
            </>
          )}
          {result.cached && (
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'var(--accent-teal)' }}>
              cached
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
