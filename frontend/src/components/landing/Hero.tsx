import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { useIdea } from '@/context/IdeaContext';

const suggestions = [
  { label: 'Juice bar in Plano', value: 'A fresh-pressed juice bar in Plano, Texas' },
  { label: 'AI tutor app', value: 'An AI tutoring app for high school math students' },
  { label: 'Thai food Dallas', value: 'A Thai street food concept in Dallas, Texas' },
];

const modules = [
  { title: 'Discover', desc: 'Uncover pain points and trends', accent: '#D07F76' },
  { title: 'Analyze', desc: 'Assess market and opportunity', accent: '#D9A26B' },
  { title: 'Setup', desc: 'Plan what it takes to launch', accent: '#9CB9AE' },
  { title: 'Validate', desc: 'Run experiments and measure', accent: '#88AEB0' },
];

export default function Hero() {
  const [idea, setIdea] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const { setIdea: setGlobalIdea } = useIdea();
  const navigate = useNavigate();
  const heroRef = useScrollReveal();
  const inputRef = useScrollReveal(120);
  const cardsRef = useScrollReveal(220);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % suggestions.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    if (!idea.trim()) return;
    setGlobalIdea(idea.trim());
    navigate('/research');
  };

  return (
    <section
      className="px-6"
      style={{
        paddingTop: 140,
        paddingBottom: 80,
        background:
          'radial-gradient(circle at 30% 15%, rgba(255,255,255,0.75), rgba(250,250,248,0.98) 42%, rgba(246,245,243,1) 100%)',
      }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: 1040 }}>
        <div ref={heroRef} className="scroll-reveal">
          <h1 className="font-heading" style={{ fontSize: 'clamp(42px, 7vw, 68px)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Don&apos;t build something nobody wants.
          </h1>
          <p style={{ marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 300, color: 'var(--text-primary)' }}>
            Stop researching. <span style={{ fontWeight: 600 }}>Start validating.</span>
          </p>
          <p
            style={{
              marginTop: 24,
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 760,
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(22px, 3.8vw, 38px)',
              fontWeight: 300,
              lineHeight: 1.35,
              color: 'var(--text-secondary)',
            }}
          >
            LaunchLens helps you test ideas with real market signals, clear analysis, and actionable next steps.
          </p>
        </div>

        <div ref={inputRef} className="scroll-reveal" style={{ marginTop: 42 }}>
          <div
            style={{
              margin: '0 auto',
              maxWidth: 900,
              padding: 20,
              borderRadius: 20,
              border: '1px solid rgba(20,20,20,0.08)',
              backgroundColor: 'rgba(255,255,255,0.72)',
              boxShadow: '0 18px 55px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(8px)',
              animation: 'searchFloat 4.8s ease-in-out infinite',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(14px, 2vw, 24px)', fontWeight: 300, color: 'var(--text-muted)' }}>
                Describe the business idea you want to validate...
              </span>
              <button
                className="ml-auto"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(16px, 2.5vw, 32px)',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#E38373',
                  border: 'none',
                  borderRadius: 999,
                  padding: 'clamp(10px, 1.6vw, 18px) clamp(18px, 3vw, 40px)',
                  cursor: idea.trim() ? 'pointer' : 'default',
                  opacity: idea.trim() ? 1 : 0.7,
                  transition: 'transform 180ms ease-out, opacity 180ms ease-out',
                }}
                onClick={handleStart}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Get started {'->'}
              </button>
            </div>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={suggestions[placeholderIdx].value}
              rows={1}
              className="w-full resize-none outline-none"
              style={{
                minHeight: 86,
                padding: '22px 24px',
                border: '1px solid rgba(20,20,20,0.10)',
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.9)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(22px, 3.8vw, 38px)',
                fontWeight: 300,
                lineHeight: 1.3,
                color: 'var(--text-primary)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#E38373';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(227,131,115,0.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(20,20,20,0.10)';
                e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.25)';
              }}
            />
          </div>
        </div>

        <div
          ref={cardsRef}
          className="scroll-reveal grid gap-4"
          style={{ marginTop: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {modules.map((module) => (
            <div
              key={module.title}
              style={{
                borderRadius: 18,
                border: '1px solid rgba(20,20,20,0.08)',
                backgroundColor: 'rgba(255,255,255,0.72)',
                padding: '22px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: module.accent,
                  margin: '0 auto 12px',
                }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 500, color: 'var(--text-primary)' }}>
                {module.title}
              </p>
              <p style={{ marginTop: 10, fontFamily: "'Inter', sans-serif", fontSize: 'clamp(16px, 2.2vw, 30px)', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                {module.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
