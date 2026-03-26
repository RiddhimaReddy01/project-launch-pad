import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell, PillButton, TopNav } from '@/components/system/editorial';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <AppShell nav={<TopNav compact /> } width="readable" readable>
      <section className="section-card" style={{ marginTop: 'var(--space-12)', textAlign: 'center' }}>
        <p className="eyebrow">404</p>
        <h1 className="section-title">This page does not exist.</h1>
        <p className="section-copy" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          Return to the main workspace and continue researching ideas with the correct route.
        </p>
        <PillButton onClick={() => navigate('/')}>Return home</PillButton>
      </section>
    </AppShell>
  );
}
