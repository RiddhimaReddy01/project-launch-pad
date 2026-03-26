import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIdea } from '@/context/IdeaContext';

const examples = [
  { label: 'Juice bar in Plano', value: 'A fresh-pressed juice bar in Plano, Texas' },
  { label: 'AI tutor app', value: 'An AI-powered tutoring app for high school students' },
  { label: 'Thai food Dallas', value: 'An authentic Thai street food restaurant in Dallas' },
];

const steps = [
  { num: '01', title: 'Discover', desc: 'Real customer signals from Reddit, Yelp, and forums — not guesses.', accent: 'hsl(var(--primary))' },
  { num: '02', title: 'Analyze', desc: 'Market size, competitors, risk, and the root cause nobody else tells you.', accent: 'hsl(var(--accent))' },
  { num: '03', title: 'Setup', desc: 'Costs, suppliers, team, and a launch timeline specific to your market.', accent: 'hsl(var(--accent))' },
  { num: '04', title: 'Validate', desc: 'Landing page, survey, outreach message, and communities to test in.', accent: 'hsl(var(--primary))' },
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
  const { setIdea } = useIdea();
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

  const startResearch = () => {
    if (!ideaInput.trim()) return;
    setIdea(ideaInput.trim());
    navigate('/research');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#F0F0F5', overflow: 'hidden' }}>
      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
              Launch<span style={{ color: '#00D4E6' }}>Lean</span>
            </span>
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              style={{
                padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#C8C8D0', cursor: 'pointer', transition: 'all 180ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#C8C8D0'; }}
            >
              {user ? 'Dashboard' : 'Log in'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', padding: '100px 24px 60px', textAlign: 'center' }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,212,230,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div ref={heroRef} className="reveal-target" style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.04em', margin: 0,
          }}>
            Don't build something{' '}
            <span style={{ color: '#00D4E6', textShadow: '0 0 40px rgba(0,212,230,0.3)' }}>nobody wants.</span>
          </h1>

          <p style={{
            marginTop: 20, fontSize: 'clamp(16px, 2.5vw, 19px)', fontWeight: 500, lineHeight: 1.7,
            color: '#9999A8', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Describe your idea. Get customer signals, market gaps, launch costs, and a validation plan — in minutes.
          </p>
        </div>
      </section>

      {/* Input */}
      <section ref={inputRef} className="reveal-target" style={{ maxWidth: 580, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{
          borderRadius: 16, padding: 3,
          background: 'linear-gradient(135deg, rgba(0,212,230,0.2), rgba(168,124,255,0.15), rgba(0,212,230,0.08))',
        }}>
          <div style={{
            borderRadius: 14, background: '#0D0D1A', padding: 20,
          }}>
            <textarea
              value={ideaInput}
              onChange={e => setIdeaInput(e.target.value)}
              placeholder={placeholder || 'Describe your idea in one sentence...'}
              rows={2}
              style={{
                width: '100%', resize: 'none', outline: 'none',
                minHeight: 72, padding: '14px 16px',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, lineHeight: 1.7,
                color: '#F0F0F5', transition: 'border-color 200ms, box-shadow 200ms',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(0,212,230,0.4)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,230,0.08)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {examples.map(s => (
                  <button
                    key={s.label}
                    onClick={() => setIdeaInput(s.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#8888A0', cursor: 'pointer', transition: 'all 180ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,230,0.3)'; e.currentTarget.style.color = '#00D4E6'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888A0'; }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={startResearch}
                style={{
                  padding: '10px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                  background: ideaInput.trim() ? 'linear-gradient(135deg, #00D4E6, #00B8C8)' : 'rgba(255,255,255,0.06)',
                  border: 'none', color: ideaInput.trim() ? '#080810' : '#666',
                  cursor: ideaInput.trim() ? 'pointer' : 'default',
                  transition: 'all 200ms', boxShadow: ideaInput.trim() ? '0 0 24px rgba(0,212,230,0.25)' : 'none',
                }}
              >
                Research this idea →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={stepsRef} className="reveal-target" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00D4E6', marginBottom: 12 }}>
            WORKFLOW
          </p>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            One sentence in. A complete plan out.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                padding: 24, borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 300ms',
                animationDelay: `${i * 80}ms`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,212,230,0.04)';
                e.currentTarget.style.borderColor = 'rgba(0,212,230,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#00D4E6' }}>{step.num}</span>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, margin: '10px 0 8px', letterSpacing: '-0.02em' }}>
                {step.title}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#8888A0', lineHeight: 1.65, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section ref={ctaRef} className="reveal-target" style={{ textAlign: 'center', padding: '60px 24px 120px', position: 'relative' }}>
        <div style={{
          position: 'absolute', bottom: -100, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(168,124,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#8888A0', marginBottom: 16 }}>
          Stop researching. Start validating.
        </p>
        <button
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{
            padding: '14px 32px', borderRadius: 999, fontSize: 15, fontWeight: 600,
            background: 'linear-gradient(135deg, #00D4E6, #00B8C8)',
            border: 'none', color: '#080810', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(0,212,230,0.2)',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(0,212,230,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(0,212,230,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Try it free →
        </button>
      </section>

      <style>{`
        .reveal-target {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        .reveal-target.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
