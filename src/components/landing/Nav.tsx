import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all duration-200"
      style={{
        height: 64,
        backgroundColor: scrolled ? 'rgba(250,250,248,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none'
      }}>
      
      <span style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => navigate('/')}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
      </span>
      <span
        onClick={() => navigate(user ? '/dashboard' : '/auth')}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 300,
          color: '#6B6B6B',
          cursor: 'pointer'
        }}>
        {user ? 'Dashboard' : 'Log in'}
      </span>
    </nav>
  );
}
