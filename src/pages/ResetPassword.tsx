import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell, PillButton, SecondaryButton, TopNav } from '@/components/system/editorial';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setIsRecovery(true);
  }, []);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <AppShell nav={<TopNav compact rightSlot={<SecondaryButton onClick={() => navigate('/auth')}>Back to login</SecondaryButton>} />} width="readable" readable>
        <section className="section-card" style={{ marginTop: 'var(--space-12)' }}>
          <p className="eyebrow">Reset password</p>
          <h1 className="section-title">This recovery link is no longer valid.</h1>
          <p className="section-copy" style={{ marginTop: 'var(--space-3)' }}>
            Request a new password reset email from the login page and try again.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell nav={<TopNav compact rightSlot={<SecondaryButton onClick={() => navigate('/')}>Home</SecondaryButton>} />} width="readable" readable>
      <section className="section-card" style={{ marginTop: 'var(--space-12)' }}>
        <p className="eyebrow">Reset password</p>
        <h1 className="section-title">{success ? 'Password updated' : 'Set a new password'}</h1>
        <p className="section-copy" style={{ marginTop: 'var(--space-3)' }}>
          {success ? 'Redirecting you back to the dashboard.' : 'Choose a new password to regain access to your research workspace.'}
        </p>

        {!success ? (
          <form onSubmit={handleReset} style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
            <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" style={{ padding: '0.95rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
            <input type="password" required minLength={6} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm password" style={{ padding: '0.95rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
            {error ? <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p> : null}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <PillButton type="submit">{loading ? 'Updating...' : 'Update password'}</PillButton>
              <SecondaryButton onClick={() => navigate('/auth')}>Cancel</SecondaryButton>
            </div>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
