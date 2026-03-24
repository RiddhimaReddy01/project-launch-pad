import { forwardRef } from 'react';

const Footer = forwardRef<HTMLElement>((_props, _ref) => {
  return (
    <footer className="text-center" style={{ padding: '64px 24px 48px' }}>
      <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>
        Built by Riddhima · 2026
      </p>
    </footer>
  );
});

Footer.displayName = 'Footer';
export default Footer;
