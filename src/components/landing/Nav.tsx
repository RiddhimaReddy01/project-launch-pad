import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Nav() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="glass sticky top-0 z-50 flex items-center justify-between px-6" style={{ height: 56 }}>
      <span className="cursor-pointer flex items-center gap-1.5" onClick={() => navigate('/')}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>Launch</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 17, color: 'var(--accent-primary)' }}>Lean</span>
      </span>
      <div className="flex items-center" style={{ gap: 20 }}>
        <span
          className="cursor-pointer transition-colors duration-200"
          style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          onClick={() => navigate(user ? '/dashboard' : '/auth')}
        >
          {user ? 'Dashboard' : 'Log in'}
        </span>
      </div>
    </nav>
  );
}
