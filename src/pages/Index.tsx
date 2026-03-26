import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIdea } from '@/context/IdeaContext';

const MIN_IDEA_LENGTH = 10;

const examples = [
  { label: 'Juice bar in Plano', value: 'A fresh-pressed juice bar in Plano, Texas' },
  { label: 'AI tutor app', value: 'An AI-powered tutoring app for high school students' },
  { label: 'Thai food Dallas', value: 'An authentic Thai street food restaurant in Dallas' },
];

const steps = [
  { num: '01', title: 'Discover', desc: 'Real customer signals from Reddit, Yelp, and forums — not guesses.' },
  { num: '02', title: 'Analyze', desc: 'Market size, competitors, risk, and the root cause nobody else tells you.' },
  { num: '03', title: 'Setup', desc: 'Costs, suppliers, team, and a launch timeline specific to your market.' },
  { num: '04', title: 'Validate', desc: 'Landing page, survey, outreach message, and communities to test in.' },
];

function useTypewriter(texts: string[], speed = 50, pause = 2200) {
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
        if (charRef.current >= currentText.length) {
          dirRef.current = 'pause';
          timeout = setTimeout(tick, pause);
        } else {
          timeout = setTimeout(tick, speed + Math.random() * 25);
        }
      } else if (dirRef.current === 'pause') {
        dirRef.current = 'erase';
        timeout = setTimeout(tick, speed);
      } else {
        charRef.current--;
        setDisplay(currentText.slice(0, charRef.current));
        if (charRef.current <= 0) {
          indexRef.current = (indexRef.current + 1) % texts.length;
          dirRef.current = 'type';
          timeout = setTimeout(tick, 400);
        } else {
          timeout = setTimeout(tick, 20);
        }
      }
    };
    timeout = setTimeout(tick, 600);
    return () => clearTimeout(timeout);
  }, [texts, speed, pause]);

  return display;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setIdea, resetProject } = useIdea();
  const [ideaInput, setIdeaInput] = useState('');
  const placeholder = useTypewriter([
    'A mobile pet grooming service in Austin...',
    'An AI resume builder for students...',
    'A farm-to-table meal prep in Denver...',
  ]);

  const heroRef = useReveal();
  const inputRef = useReveal();
  const stepsRef = useReveal();
  const ctaRef = useReveal();

  const trimmedIdea = ideaInput.trim();
  const canStart = trimmedIdea.length >= MIN_IDEA_LENGTH;
  const charHint = useMemo(() => {
    if (trimmedIdea.length > 0 && trimmedIdea.length < MIN_IDEA_LENGTH)
      return `${MIN_IDEA_LENGTH - trimmedIdea.length} more characters needed`;
    return '';
  }, [trimmedIdea]);

  const startResearch = () => {
    if (!canStart) return;
    resetProject();
    setIdea(trimmedIdea);
    navigate('/research');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Nav */}
      <header className="top-nav" role="banner">
        <nav className="top-nav__inner" aria-label="Main navigation">
          <button onClick={() => navigate('/')} className="brand-button" aria-label="Go to homepage">
            <span className="brand-mark" aria-label="LaunchLens home">
              <span className="brand-mark__strong">Launch</span>
              <span className="brand-mark__light">Lens</span>
            </span>
          </button>
          <div style={{ display: 'flex', gap: 10 }} role="group" aria-label="Navigation actions">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="btn-secondary"
              style={{ padding: '8px 20px', fontSize: 14 }}
            >
              {user ? 'Dashboard' : 'Log in'}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
        <div ref={heroRef} className="reveal-target" style={{ maxWidth: 620, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 'clamp(32px, 5.5vw, 52px)',
            fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.04em', margin: 0,
            color: 'var(--color-text)',
          }}>
            Don't build something{' '}
            <span style={{ color: 'var(--color-accent)' }}>nobody wants.</span>
          </h1>

          <p style={{
            marginTop: 20, fontSize: 'clamp(15px, 2.2vw, 18px)', fontWeight: 500, lineHeight: 1.7,
            color: 'var(--color-text-soft)', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Describe your idea. Get customer signals, market gaps, launch costs, and a validation plan — in minutes.
          </p>
        </div>
      </section>

      {/* Input */}
      <section id="main-content" ref={inputRef} className="reveal-target" style={{ maxWidth: 560, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{
          borderRadius: 16, padding: 24,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }} role="form" aria-label="Describe your business idea">
          <label htmlFor="idea-input" className="sr-only">Describe your business idea</label>
          <textarea
            id="idea-input"
            value={ideaInput}
            onChange={e => setIdeaInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && canStart) { e.preventDefault(); startResearch(); } }}
            placeholder={placeholder || 'Describe your idea in one sentence...'}
            rows={2}
            aria-describedby="idea-hint"
            style={{
              width: '100%', resize: 'none', outline: 'none',
              minHeight: 72, padding: '14px 16px',
              borderRadius: 12, border: '1px solid var(--color-border)',
              background: 'var(--surface-input)',
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 400, lineHeight: 1.7,
              color: 'var(--color-text)', transition: 'border-color 200ms, box-shadow 200ms',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-text)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(34,34,34,0.06)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          <div id="idea-hint" aria-live="polite" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 8, fontSize: 12, minHeight: 18,
            color: charHint ? 'var(--color-warning)' : 'var(--color-text-muted)',
          }}>
            <span>{charHint || 'Tip: include a location and business type for best results'}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{trimmedIdea.length} chars</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Example ideas">
              {examples.map(s => (
                <button
                  key={s.label}
                  onClick={() => setIdeaInput(s.value)}
                  aria-label={`Use example: ${s.label}`}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-soft)', cursor: 'pointer', transition: 'all 180ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-soft)'; }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={startResearch}
              className="btn-primary"
              disabled={!canStart}
              aria-label="Start researching your idea"
              style={{
                padding: '10px 24px', fontSize: 14,
                opacity: canStart ? 1 : 0.5,
                cursor: canStart ? 'pointer' : 'default',
              }}
            >
              Research this idea →
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={stepsRef} className="reveal-target" aria-labelledby="how-it-works-heading" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>WORKFLOW</p>
          <h2 id="how-it-works-heading" style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-text)' }}>
            One sentence in. A complete plan out.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                padding: 24, borderRadius: 16,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                transition: 'all 250ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-accent)' }}>{step.num}</span>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: '10px 0 8px', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>
                {step.title}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-soft)', lineHeight: 1.65, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section ref={ctaRef} className="reveal-target" style={{ textAlign: 'center', padding: '40px 24px 100px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 16 }}>
          Stop researching. Start validating.
        </p>
        <button
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="btn-primary"
          style={{ padding: '14px 32px', fontSize: 15 }}
        >
          Try it free →
        </button>
      </section>
    </div>
  );
}
