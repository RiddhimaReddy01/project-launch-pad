import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/context/AuthContext';

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

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      redirect_uri: window.location.origin + '/dashboard',
    });
    if (result?.error) {
      setError(result.error.message || 'Google sign-in failed');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '14px 16px',
    border: '1px solid var(--divider-section)',
    backgroundColor: 'var(--surface-bg)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    borderRadius: 12,
    outline: 'none',
    transition: 'all 200ms ease-out',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--surface-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,230,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <span
        className="cursor-pointer flex items-center gap-1.5"
        style={{ marginBottom: 48, position: 'relative' }}
        onClick={() => navigate('/')}
      >
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: 'var(--text-primary)' }}>Launch</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 20, color: 'var(--accent-primary)' }}>Lean</span>
      </span>

      <div
        className="rounded-2xl"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 36,
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--divider)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        <h2
          className="font-heading"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ textAlign: 'center', marginBottom: 32, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {isSignUp ? 'Start validating your ideas' : 'Continue your research'}
        </p>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          className="w-full rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{
            padding: '13px 16px',
            border: '1px solid var(--divider-section)',
            backgroundColor: 'var(--surface-elevated)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center" style={{ gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider-section)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>OR</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider-section)' }} />
        </div>

        {forgotMode ? (
          forgotSent ? (
            <div className="text-center">
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Check your email</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 24 }}>
                We sent a password reset link to {email}.
              </p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="cursor-pointer"
                style={{ fontSize: 14, color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none' }}>
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full mb-4"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'none'; }} />
              {error && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)', marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl mb-3"
                style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600 }}>
                {loading ? '...' : 'Send reset link'}
              </button>
              <p className="text-center" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                <span className="cursor-pointer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }} onClick={() => { setForgotMode(false); setError(''); }}>
                  Back to login
                </span>
              </p>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleEmailAuth}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full mb-3"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'none'; }} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full mb-2"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'none'; }} />
              {!isSignUp && (
                <p className="text-right mb-4">
                  <span className="cursor-pointer" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}
                    onClick={() => { setForgotMode(true); setError(''); }}>
                    Forgot password?
                  </span>
                </p>
              )}
              {isSignUp && <div className="mb-4" />}
              {error && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)', marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl transition-all duration-200 active:scale-[0.98]"
                style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? '...' : isSignUp ? 'Sign up' : 'Log in'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span className="cursor-pointer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
                {isSignUp ? 'Log in' : 'Sign up'}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
