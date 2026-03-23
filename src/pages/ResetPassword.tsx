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
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
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

  if (!isRecovery) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center" style={{ maxWidth: 400 }}>
          <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Invalid link</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 24 }}>
            This password reset link is invalid or expired.
          </p>
          <button onClick={() => navigate('/auth')} className="rounded-[10px] px-5 py-2.5"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <span className="cursor-pointer" style={{ fontSize: 18, marginBottom: 48 }} onClick={() => navigate('/')}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
      </span>

      <div className="rounded-[16px]" style={{ width: '100%', maxWidth: 400, padding: 32, backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {success ? (
          <div className="text-center">
            <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>Password updated</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <>
            <p className="font-heading text-center" style={{ fontSize: 22, marginBottom: 24 }}>Set new password</p>
            <form onSubmit={handleReset}>
              <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6}
                className="w-full rounded-[10px] outline-none mb-3"
                style={{ padding: '12px 14px', border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-bg)', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-primary)' }} />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required minLength={6}
                className="w-full rounded-[10px] outline-none mb-4"
                style={{ padding: '12px 14px', border: '1px solid var(--divider-light)', backgroundColor: 'var(--surface-bg)', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-primary)' }} />
              {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#8C6060', marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-[12px]"
                style={{ padding: '12px 16px', backgroundColor: 'var(--text-primary)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
