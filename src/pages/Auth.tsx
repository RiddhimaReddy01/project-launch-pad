import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/context/AuthContext';
import { AppShell, PillButton, SecondaryButton, TopNav } from '@/components/system/editorial';

function getPasswordStrength(pw: string): { level: number; label: string } {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak' };
  if (score <= 2) return { level: 2, label: 'Fair' };
  if (score <= 3) return { level: 3, label: 'Good' };
  return { level: 4, label: 'Strong' };
}

const strengthClasses = ['', 'filled-weak', 'filled-fair', 'filled-good', 'filled-strong'];

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result?.error) setError(result.error.message || 'Google sign-in failed');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <AppShell
      nav={
        <TopNav
          compact
          rightSlot={<SecondaryButton onClick={() => navigate('/')}>Back home</SecondaryButton>}
        />
      }
      width="readable"
      readable
    >
      <section className="section-card" style={{ marginTop: 'var(--space-12)' }}>
        <p className="eyebrow">{forgotMode ? 'Account recovery' : isSignUp ? 'Create account' : 'Welcome back'}</p>
        <h1 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>
          {forgotMode ? 'Reset your password' : isSignUp ? 'Start your founder workspace' : 'Continue your research'}
        </h1>
        <p className="section-copy" style={{ marginTop: 0 }}>
          Access saved ideas, validation assets, and the full research flow.
        </p>

        <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
          <SecondaryButton onClick={handleGoogle} aria-label="Sign in with Google">Continue with Google</SecondaryButton>

          {forgotMode ? (
            forgotSent ? (
              <div className="insight-callout" role="status" aria-live="polite">
                <p className="insight-callout__title">Check your inbox</p>
                <div className="insight-callout__body">We sent a reset link to {email}.</div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'grid', gap: 'var(--space-4)' }} aria-label="Password reset form">
                <div>
                  <label htmlFor="reset-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Email address</label>
                  <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} autoComplete="email" />
                </div>
                {error ? <p role="alert" style={{ color: 'var(--color-danger)', margin: 0, fontSize: 14 }}>{error}</p> : null}
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <PillButton type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</PillButton>
                  <SecondaryButton onClick={() => { setForgotMode(false); setError(''); }}>Back to login</SecondaryButton>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleEmailAuth} style={{ display: 'grid', gap: 'var(--space-4)' }} aria-label={isSignUp ? 'Create account form' : 'Sign in form'}>
              <div>
                <label htmlFor="auth-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Email address</label>
                <input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="auth-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Password</label>
                <input id="auth-password" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" style={inputStyle} autoComplete={isSignUp ? 'new-password' : 'current-password'} aria-describedby={isSignUp ? 'pw-strength' : undefined} />
                {isSignUp && password.length > 0 && (
                  <div id="pw-strength">
                    <div className="password-strength" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`password-strength__bar${i <= strength.level ? ` password-strength__bar--${strengthClasses[strength.level]}` : ''}`} />
                      ))}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }} aria-live="polite">
                      {strength.label}
                      {strength.level < 3 ? ' — try adding numbers, symbols, or uppercase letters' : ''}
                    </p>
                  </div>
                )}
              </div>
              {!isSignUp ? (
                <button type="button" onClick={() => { setForgotMode(true); setError(''); }} style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14 }}>
                  Forgot password?
                </button>
              ) : null}
              {error ? <p role="alert" style={{ color: 'var(--color-danger)', margin: 0, fontSize: 14 }}>{error}</p> : null}
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <PillButton type="submit" disabled={loading}>{loading ? 'Working...' : isSignUp ? 'Create account' : 'Log in'}</PillButton>
                <SecondaryButton onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
                  {isSignUp ? 'Use existing account' : 'Create account'}
                </SecondaryButton>
              </div>
            </form>
          )}
        </div>
      </section>
    </AppShell>
  );
}
