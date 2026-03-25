import type { SectionKey } from '@/lib/analyze';

export interface ModuleInfo {
  key: SectionKey;
  label: string;
  mono: string;
  subtitle: string;
  status: 'idle' | 'loading' | 'completed' | 'error' | 'stale';
  lastRun?: string;
}

interface Props {
  modules: ModuleInfo[];
  activeModule: SectionKey;
  onSelect: (key: SectionKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  completedCount: number;
}

export default function ModuleRail({ modules, activeModule, onSelect, collapsed, onToggle, completedCount }: Props) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-4 px-1" style={{ width: 48, borderRight: '1px solid var(--divider)', backgroundColor: 'var(--surface-bg)' }}>
        <button
          onClick={onToggle}
          className="mb-3 transition-all duration-150"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 4 }}
          title="Expand modules"
        >
          ›
        </button>
        {modules.map(m => {
          const isActive = m.key === activeModule;
          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className="transition-all duration-150"
              title={m.label}
              style={{
                width: 34, height: 34, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                backgroundColor: isActive ? 'var(--accent-primary)' : m.status === 'completed' ? 'rgba(0,212,230,0.1)' : 'transparent',
                color: isActive ? '#080810' : m.status === 'completed' ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {m.mono}
            </button>
          );
        })}
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
            {completedCount}/{modules.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col py-4 overflow-y-auto"
      style={{
        width: 220,
        minWidth: 220,
        borderRight: '1px solid var(--divider)',
        backgroundColor: 'var(--surface-bg)',
      }}
    >
      <div className="flex items-center justify-between px-4 mb-4">
        <p className="section-label" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          MODULES
        </p>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 4 }}
          title="Collapse"
        >
          ‹
        </button>
      </div>

      <div className="flex flex-col gap-0.5 px-2 flex-1">
        {modules.map(m => {
          const isActive = m.key === activeModule;
          const statusColor = m.status === 'completed' ? 'var(--accent-primary)' : m.status === 'loading' ? 'var(--accent-amber)' : m.status === 'error' ? 'var(--error)' : m.status === 'stale' ? 'var(--accent-amber)' : 'var(--divider-section)';

          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className="text-left rounded-xl p-3 transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--surface-card)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                border: isActive ? '1px solid var(--divider)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: isActive ? 'var(--accent-primary)' : m.status === 'completed' ? 'rgba(0,212,230,0.1)' : 'var(--surface-elevated)',
                  color: isActive ? '#080810' : m.status === 'completed' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'all 200ms ease-out',
                }}>
                  {m.mono}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: 1,
                  }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {m.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2 ml-9">
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor, boxShadow: m.status === 'completed' ? `0 0 6px ${statusColor}` : 'none' }} className={m.status === 'loading' ? 'animate-pulse' : ''} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {m.status === 'idle' ? 'Not run' : m.status === 'loading' ? 'Running...' : m.status === 'completed' ? 'Complete' : m.status === 'error' ? 'Failed' : 'Stale'}
                </span>
                {m.lastRun && m.status === 'completed' && (
                  <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {m.lastRun}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-3 mt-auto" style={{ borderTop: '1px solid var(--divider)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          {completedCount} of {modules.length} complete
        </p>
      </div>
    </div>
  );
}
