import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

function brandLogo(accentColor = 'var(--color-accent)') {
  return (
    <span className="brand-mark" aria-label="LaunchLens home">
      <span className="brand-mark__strong">Launch</span>{' '}
      <span className="brand-mark__light" style={{ color: accentColor }}>Lens</span>
    </span>
  );
}

export function AppShell({
  children,
  nav,
  width = 'page',
  readable = false,
}: {
  children: ReactNode;
  nav?: ReactNode;
  width?: 'page' | 'readable';
  readable?: boolean;
}) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {nav}
      <main
        id="main-content"
        className={readable || width === 'readable' ? 'app-shell__content app-shell__content--readable' : 'app-shell__content'}
      >
        {children}
      </main>
    </div>
  );
}

export function TopNav({
  rightSlot,
  compact = false,
}: {
  rightSlot?: ReactNode;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <header className={`top-nav${compact ? ' top-nav--compact' : ''}`} role="banner">
      <nav className="top-nav__inner" aria-label="Main navigation">
        <button type="button" className="brand-button" onClick={() => navigate('/')} aria-label="Go to homepage">
          {brandLogo()}
        </button>
        <div className="top-nav__actions" role="group" aria-label="Navigation actions">
          {rightSlot}
        </div>
      </nav>
    </header>
  );
}

export function HeroSection({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="hero-section">
      <div className="hero-section__copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display-title">{title}</h1>
        {body ? <div className="lead-copy">{body}</div> : null}
      </div>
      {aside ? <div className="hero-section__aside">{aside}</div> : null}
    </section>
  );
}

export function IdeaInputCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <section className="idea-input-card">
      <div className="idea-input-card__header">
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ScoreSummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="score-summary-card">
      <p className="score-summary-card__label">{label}</p>
      <p className="score-summary-card__value">{value}</p>
      {note ? <p className="score-summary-card__note">{note}</p> : null}
    </article>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  readingWidth = false,
}: {
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  readingWidth?: boolean;
}) {
  return (
    <section className={`section-card${readingWidth ? ' section-card--reading' : ''}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="section-title">{title}</h2> : null}
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export function EvidenceList({
  items,
}: {
  items: { title?: string; body: ReactNode; meta?: ReactNode }[];
}) {
  return (
    <div className="evidence-list">
      {items.map((item, index) => (
        <article key={index} className="evidence-list__item">
          {item.title ? <p className="evidence-list__title">{item.title}</p> : null}
          <div className="evidence-list__body">{item.body}</div>
          {item.meta ? <div className="evidence-list__meta">{item.meta}</div> : null}
        </article>
      ))}
    </div>
  );
}

export function MetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="metric-row">
      <div>
        <p className="metric-row__label">{label}</p>
        {detail ? <div className="metric-row__detail">{detail}</div> : null}
      </div>
      <div className="metric-row__value">{value}</div>
    </div>
  );
}

export function PillButton({
  children,
  active = false,
  onClick,
  style,
  type = 'button',
  disabled = false,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  type?: 'button' | 'submit';
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type={type}
      className={`pill-button${active ? ' pill-button--active' : ''}`}
      onClick={onClick}
      style={{ ...style, ...(disabled ? { opacity: 0.55, pointerEvents: 'none' as const } : {}) }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  style,
  disabled = false,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: CSSProperties;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button type={type} className="secondary-button" onClick={onClick} style={style} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function InsightCallout({
  title,
  body,
  tone = 'default',
}: {
  title: ReactNode;
  body: ReactNode;
  tone?: 'default' | 'warm';
}) {
  return (
    <aside className={`insight-callout${tone === 'warm' ? ' insight-callout--warm' : ''}`}>
      <p className="insight-callout__title">{title}</p>
      <div className="insight-callout__body">{body}</div>
    </aside>
  );
}

export function BrandMark() {
  return brandLogo();
}
