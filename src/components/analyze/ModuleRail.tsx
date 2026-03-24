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
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                backgroundColor: isActive ? 'var(--text-primary)' : m.status === 'completed' ? 'rgba(91,140,126,0.08)' : 'transparent',
                color: isActive ? '#fff' : m.status === 'completed' ? 'var(--accent-teal)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {m.mono}
            </button>
          );
        })}
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, color: 'var(--text-muted)' }}>
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
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Modules
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
          const statusColor = m.status === 'completed' ? 'var(--accent-teal)' : m.status === 'loading' ? 'var(--accent-amber)' : m.status === 'error' ? 'hsl(0 84% 60%)' : m.status === 'stale' ? 'var(--accent-amber)' : 'var(--divider-section)';

          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className="text-left rounded-[10px] p-3 transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--surface-card)' : 'transparent',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 7,
                  fontSize: 11, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '0.02em',
                  backgroundColor: isActive ? 'var(--text-primary)' : m.status === 'completed' ? 'rgba(91,140,126,0.08)' : 'var(--surface-input)',
                  color: isActive ? '#fff' : m.status === 'completed' ? 'var(--accent-teal)' : 'var(--text-muted)',
                  transition: 'all 200ms ease-out',
                }}>
                  {m.mono}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    fontWeight: isActive ? 400 : 300,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: 1,
                  }}>
                    {m.label}
                  </p>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {m.subtitle}
                  </p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 mt-2 ml-9">
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: statusColor }} className={m.status === 'loading' ? 'animate-pulse' : ''} />
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: 'var(--text-muted)' }}>
                  {m.status === 'idle' ? 'Not run' : m.status === 'loading' ? 'Running...' : m.status === 'completed' ? 'Complete' : m.status === 'error' ? 'Failed' : 'Stale'}
                </span>
                {m.lastRun && m.status === 'completed' && (
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {m.lastRun}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-3 mt-auto" style={{ borderTop: '1px solid var(--divider)' }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>
          {completedCount} of {modules.length} complete
        </p>
      </div>
    </div>
  );
}
