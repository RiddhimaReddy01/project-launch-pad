import { useState, useMemo } from 'react';
import type { AnalyzeContext, SectionKey } from '@/lib/analyze';
import type { DecomposeResult } from '@/lib/decompose';
import type { DiscoverResult } from '@/lib/discover';

export interface InputSelection {
  business_type: boolean;
  location: boolean;
  target_customers: boolean;
  selected_insight: boolean;
  discover_insights: boolean;
  customer_evidence: boolean;
  prior_sections: Set<SectionKey>;
}

type Preset = 'lean' | 'balanced' | 'full';

const PRESETS: Record<Preset, { label: string; description: string }> = {
  lean: { label: 'Lean', description: 'Decomposition + selected insight only' },
  balanced: { label: 'Balanced', description: 'Add key discover insights' },
  full: { label: 'Full', description: 'All available data + prior sections' },
};

const DEFAULT_INPUTS: InputSelection = {
  business_type: true,
  location: true,
  target_customers: true,
  selected_insight: true,
  discover_insights: false,
  customer_evidence: false,
  prior_sections: new Set(),
};

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  activeModule: SectionKey;
  inputs: InputSelection;
  onInputsChange: (inputs: InputSelection) => void;
  completedSections: Set<SectionKey>;
  decomposeResult: DecomposeResult | null;
  discoverResult: DiscoverResult | null;
  selectedInsight: string | null;
  isDirty: boolean;
  isRunning: boolean;
  hasResult: boolean;
  onCompile: () => void;
}

export default function InputComposer({
  collapsed, onToggle, activeModule, inputs, onInputsChange,
  completedSections, decomposeResult, discoverResult, selectedInsight,
  isDirty, isRunning, hasResult, onCompile,
}: Props) {
  const [preset, setPreset] = useState<Preset>('balanced');

  const inputCount = useMemo(() => {
    let count = 0;
    if (inputs.business_type) count++;
    if (inputs.location) count++;
    if (inputs.target_customers) count++;
    if (inputs.selected_insight) count++;
    if (inputs.discover_insights) count++;
    if (inputs.customer_evidence) count++;
    count += inputs.prior_sections.size;
    return count;
  }, [inputs]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const next: InputSelection = { ...DEFAULT_INPUTS, prior_sections: new Set() };
    if (p === 'balanced') {
      next.discover_insights = true;
    } else if (p === 'full') {
      next.discover_insights = true;
      next.customer_evidence = true;
      completedSections.forEach(s => next.prior_sections.add(s));
    }
    onInputsChange(next);
  };

  const toggleInput = (key: keyof Omit<InputSelection, 'prior_sections'>) => {
    onInputsChange({ ...inputs, [key]: !inputs[key] });
  };

  const togglePriorSection = (key: SectionKey) => {
    const next = new Set(inputs.prior_sections);
    next.has(key) ? next.delete(key) : next.add(key);
    onInputsChange({ ...inputs, prior_sections: next });
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 rounded-l-[10px] px-2 py-4 transition-all duration-200 hover:px-3"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--divider)',
          borderRight: 'none',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 400,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
        }}
      >
        Inputs ({inputCount})
      </button>
    );
  }

  const INPUT_ITEMS: { key: keyof Omit<InputSelection, 'prior_sections'>; label: string; available: boolean; value?: string }[] = [
    { key: 'business_type', label: 'Business Type', available: !!decomposeResult, value: decomposeResult?.stage1?.business_type },
    { key: 'location', label: 'Location', available: !!decomposeResult, value: decomposeResult ? `${decomposeResult.stage1.location.city}, ${decomposeResult.stage1.location.state}` : undefined },
    { key: 'target_customers', label: 'Target Customers', available: !!decomposeResult },
    { key: 'selected_insight', label: 'Selected Insight', available: !!selectedInsight, value: selectedInsight || undefined },
    { key: 'discover_insights', label: 'All Discover Insights', available: !!(discoverResult?.insights?.length) },
    { key: 'customer_evidence', label: 'Customer Evidence', available: !!(discoverResult?.insights?.length) },
  ];

  const PRIOR_SECTIONS: { key: SectionKey; label: string }[] = [
    { key: 'opportunity', label: 'Opportunity' },
    { key: 'customers', label: 'Customers' },
    { key: 'competitors', label: 'Competitors' },
    { key: 'rootcause', label: 'Root Cause' },
    { key: 'costs', label: 'Costs' },
    { key: 'risk', label: 'Risk' },
    { key: 'location', label: 'Location' },
    { key: 'moat', label: 'Moat' },
  ].filter(s => s.key !== activeModule && completedSections.has(s.key));

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 280,
        minWidth: 280,
        borderLeft: '1px solid var(--divider)',
        backgroundColor: 'var(--surface-bg)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Input Composer
          </p>
        </div>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4 }}
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ fontSize: 13 }}>
        {/* Presets */}
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Presets
        </p>
        <div className="flex gap-1.5 mb-6">
          {(Object.entries(PRESETS) as [Preset, typeof PRESETS.lean][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="rounded-[6px] px-3 py-1.5 transition-all duration-150"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: preset === key ? 400 : 300,
                backgroundColor: preset === key ? 'var(--text-primary)' : 'var(--surface-card)',
                color: preset === key ? '#fff' : 'var(--text-muted)',
                border: preset === key ? 'none' : '1px solid var(--divider)',
                cursor: 'pointer',
              }}
              title={cfg.description}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Input toggles */}
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Data Sources
        </p>
        <div className="flex flex-col gap-1 mb-6">
          {INPUT_ITEMS.map(item => (
            <label
              key={item.key}
              className="flex items-start gap-2.5 rounded-[8px] p-2.5 cursor-pointer transition-colors duration-150"
              style={{
                backgroundColor: inputs[item.key] ? 'rgba(26,26,26,0.02)' : 'transparent',
                opacity: item.available ? 1 : 0.4,
                pointerEvents: item.available ? 'auto' : 'none',
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 3, marginTop: 1, flexShrink: 0,
                border: inputs[item.key] ? 'none' : '1.5px solid var(--divider-section)',
                backgroundColor: inputs[item.key] ? 'var(--text-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease-out',
              }}>
                {inputs[item.key] && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <input type="checkbox" checked={inputs[item.key]} onChange={() => toggleInput(item.key)} className="sr-only" />
              <div className="flex-1 min-w-0">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: inputs[item.key] ? 400 : 300, color: inputs[item.key] ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'block' }}>
                  {item.label}
                </span>
                {item.value && inputs[item.key] && (
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.value}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Prior sections */}
        {PRIOR_SECTIONS.length > 0 && (
          <>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Prior Analysis
            </p>
            <div className="flex flex-col gap-1 mb-6">
              {PRIOR_SECTIONS.map(s => {
                const included = inputs.prior_sections.has(s.key);
                return (
                  <label
                    key={s.key}
                    className="flex items-center gap-2.5 rounded-[8px] p-2.5 cursor-pointer transition-colors duration-150"
                    style={{ backgroundColor: included ? 'rgba(26,26,26,0.02)' : 'transparent' }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: included ? 'none' : '1.5px solid var(--divider-section)',
                      backgroundColor: included ? 'var(--text-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {included && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <input type="checkbox" checked={included} onChange={() => togglePriorSection(s.key)} className="sr-only" />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: included ? 400 : 300, color: included ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {/* Input summary */}
        <div className="rounded-[8px] p-3 mb-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 2 }}>
            Using {inputCount} input{inputCount !== 1 ? 's' : ''}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {[
              inputs.business_type && 'Business Type',
              inputs.location && 'Location',
              inputs.target_customers && 'Customers',
              inputs.selected_insight && 'Insight',
              inputs.discover_insights && 'Discover Data',
              inputs.customer_evidence && 'Evidence',
              ...Array.from(inputs.prior_sections).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Dirty state */}
        {isDirty && hasResult && (
          <div className="rounded-[8px] p-3 mb-4" style={{ backgroundColor: 'rgba(212,136,15,0.06)', border: '1px solid rgba(212,136,15,0.15)' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--accent-amber)' }}>
              Inputs changed — recompile recommended
            </p>
          </div>
        )}
      </div>

      {/* Compile button */}
      <div className="p-4" style={{ borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={onCompile}
          disabled={isRunning}
          className="w-full rounded-[10px] py-3 transition-all duration-200 active:scale-[0.97]"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            backgroundColor: isRunning ? 'var(--divider)' : 'var(--text-primary)',
            color: isRunning ? 'var(--text-muted)' : '#fff',
            border: 'none',
            cursor: isRunning ? 'default' : 'pointer',
            opacity: isRunning ? 0.7 : 1,
          }}
        >
          {isRunning ? 'Compiling...' : hasResult ? 'Recompile with Changes' : 'Compile Analysis'}
        </button>
        {hasResult && !isDirty && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
            Up to date
          </p>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_INPUTS };
export type { Preset };
