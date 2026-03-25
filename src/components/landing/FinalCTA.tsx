import { forwardRef } from 'react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { useNavigate } from 'react-router-dom';

const FinalCTA = forwardRef<HTMLElement>((_props, _ref) => {
  const scrollRef = useScrollReveal();
  const navigate = useNavigate();

  return (
    <section ref={scrollRef} className="scroll-reveal px-6 mx-auto text-center" style={{ maxWidth: 500 }}>
      <h2 className="font-heading" style={{ fontSize: 28 }}>
        Stop researching.{' '}
        <span style={{ color: 'var(--accent-primary)' }}>Start validating.</span>
      </h2>

      <button
        className="btn-primary font-button"
        style={{ marginTop: 28, fontSize: 15, padding: '14px 28px' }}
        onClick={() => navigate('/')}
      >
        Try it free →
      </button>

      <p className="font-caption" style={{ marginTop: 12, color: 'var(--text-muted)' }}>
        No signup required.
      </p>
    </section>
  );
});

FinalCTA.displayName = 'FinalCTA';
export default FinalCTA;
