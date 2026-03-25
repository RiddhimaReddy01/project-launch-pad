import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) setIsRecovery(true);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
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

  if (!isRecovery) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center" style={{ maxWidth: 420 }}>
          <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Invalid link</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 28 }}>
            This password reset link is invalid or expired.
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary rounded-xl px-6 py-3" style={{ fontSize: 14, fontWeight: 600 }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

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

      <span className="cursor-pointer flex items-center gap-1.5" style={{ marginBottom: 48, position: 'relative' }} onClick={() => navigate('/')}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: 'var(--text-primary)' }}>Launch</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 20, color: 'var(--accent-primary)' }}>Lean</span>
      </span>

      <div className="rounded-2xl" style={{
        width: '100%', maxWidth: 420, padding: 36,
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--divider)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        position: 'relative',
      }}>
        {success ? (
          <div className="text-center">
            <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Password updated</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <>
            <p className="font-heading text-center" style={{ fontSize: 24, fontWeight: 700, marginBottom: 28 }}>Set new password</p>
            <form onSubmit={handleReset}>
              <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} className="w-full mb-3" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'none'; }} />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required minLength={6} className="w-full mb-4" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'none'; }} />
              {error && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)', marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl"
                style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
