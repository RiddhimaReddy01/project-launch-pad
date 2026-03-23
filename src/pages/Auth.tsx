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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <span
        className="cursor-pointer"
        style={{ fontSize: 18, marginBottom: 48 }}
        onClick={() => navigate('/')}
      >
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
      </span>

      <div
        className="rounded-[16px]"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 32,
          backgroundColor: 'var(--surface-card)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <h2
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 24,
            fontWeight: 400,
            color: 'var(--text-primary)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p
          className="font-caption"
          style={{ textAlign: 'center', marginBottom: 28, fontSize: 13 }}
        >
          {isSignUp ? 'Start validating your ideas' : 'Continue your research'}
        </p>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          className="w-full rounded-[12px] transition-all duration-200 active:scale-[0.98]"
          style={{
            padding: '12px 16px',
            border: '1px solid var(--divider-light)',
            backgroundColor: 'var(--surface-bg)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider-light)' }} />
          <span className="font-caption" style={{ fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider-light)' }} />
        </div>

        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[10px] outline-none transition-all duration-200 mb-3"
            style={{
              padding: '12px 14px',
              border: '1px solid var(--divider-light)',
              backgroundColor: 'var(--surface-bg)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider-light)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-[10px] outline-none transition-all duration-200 mb-4"
            style={{
              padding: '12px 14px',
              border: '1px solid var(--divider-light)',
              backgroundColor: 'var(--surface-bg)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider-light)'; e.currentTarget.style.boxShadow = 'none'; }}
          />

          {error && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#E05252', marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[12px] transition-all duration-200 active:scale-[0.98]"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--accent-purple)',
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : isSignUp ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p
          className="font-caption"
          style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}
        >
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            className="cursor-pointer"
            style={{ color: 'var(--accent-purple)', fontWeight: 400 }}
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
}
