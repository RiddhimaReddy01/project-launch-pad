import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { useIdea } from '@/context/IdeaContext';

const suggestions = [
  { label: 'Juice bar in Plano', value: 'A fresh-pressed juice bar in Plano, Texas' },
  { label: 'AI tutor app', value: 'An AI-powered tutoring app for high school students' },
  { label: 'Thai food Dallas', value: 'An authentic Thai street food restaurant in Dallas' },
];

const PLACEHOLDER_TEXTS = [
  'A mobile pet grooming service in Austin...',
  'An AI-powered resume builder for students...',
  'A farm-to-table meal prep delivery in Denver...',
  'A coworking space for freelancers in Brooklyn...',
];

function useTypewriter(texts: string[], speed = 55, pause = 2000) {
  const [display, setDisplay] = useState('');
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const dirRef = useRef<'type' | 'pause' | 'erase'>('type');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const currentText = texts[indexRef.current];
      if (dirRef.current === 'type') {
        charRef.current++;
        setDisplay(currentText.slice(0, charRef.current));
        if (charRef.current >= currentText.length) { dirRef.current = 'pause'; timeout = setTimeout(tick, pause); }
        else { timeout = setTimeout(tick, speed + Math.random() * 30); }
      } else if (dirRef.current === 'pause') {
        dirRef.current = 'erase'; timeout = setTimeout(tick, speed);
      } else {
        charRef.current--;
        setDisplay(currentText.slice(0, charRef.current));
        if (charRef.current <= 0) { indexRef.current = (indexRef.current + 1) % texts.length; dirRef.current = 'type'; timeout = setTimeout(tick, 400); }
        else { timeout = setTimeout(tick, 25); }
      }
    };
    timeout = setTimeout(tick, 600);
    return () => clearTimeout(timeout);
  }, [texts, speed, pause]);

  return display;
}

export default function Hero() {
  const [idea, setIdea] = useState('');
  const { setIdea: setGlobalIdea } = useIdea();
  const navigate = useNavigate();
  const headlineRef = useScrollReveal();
  const placeholder = useTypewriter(PLACEHOLDER_TEXTS);

  const handleStart = () => {
    if (!idea.trim()) return;
    setGlobalIdea(idea.trim());
    navigate('/research');
  };
  const subtitleRef = useScrollReveal(80);
  const inputRef = useScrollReveal(160);

  return (
    <section className="flex flex-col items-center px-6" style={{ paddingTop: 140 }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,212,230,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <h1 ref={headlineRef} className="scroll-reveal font-heading text-center" style={{ maxWidth: 560, fontSize: 40, position: 'relative' }}>
        Don't build something{' '}
        <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 30px rgba(0,212,230,0.3)' }}>nobody wants.</span>
      </h1>

      <p
        ref={subtitleRef}
        className="scroll-reveal font-body text-center"
        style={{ maxWidth: 460, marginTop: 20 }}
      >
        Describe your idea. Get real customer signals, market gaps, launch costs, and a validation plan — in ten minutes.
      </p>

      <div ref={inputRef} className="scroll-reveal w-full flex flex-col items-center" style={{ marginTop: 48, maxWidth: 520, position: 'relative' }}>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={placeholder || 'Describe your idea in one sentence...'}
          rows={1}
          className="w-full resize-none outline-none transition-all duration-200"
          style={{
            minHeight: 56,
            padding: '16px 20px',
            border: '1px solid var(--divider)',
            borderRadius: 14,
            backgroundColor: 'var(--surface-card)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.75,
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,230,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--divider)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <div className="w-full flex items-center justify-between" style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
            Try:{' '}
            {suggestions.map((s, i) => (
              <span key={s.label}>
                <span
                  className="cursor-pointer transition-colors duration-200"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onClick={() => setIdea(s.value)}
                >
                  {s.label}
                </span>
                {i < suggestions.length - 1 && ' · '}
              </span>
            ))}
          </p>

          <button
            className="font-button shrink-0 btn-primary"
            style={{
              fontSize: 14,
              padding: '12px 24px',
              opacity: idea.trim() ? 1 : 0.4,
              cursor: idea.trim() ? 'pointer' : 'default',
            }}
            onClick={handleStart}
          >
            Research this idea →
          </button>
        </div>
      </div>
    </section>
  );
}
