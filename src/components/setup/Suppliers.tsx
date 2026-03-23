import { useState } from 'react';
import type { SuppliersResult, SupplierItem } from '@/lib/setup';

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Engineering: { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  Marketing: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
  Legal: { color: 'hsl(0 84% 60%)', bg: 'rgba(140,96,96,0.06)' },
  Operations: { color: 'var(--text-secondary)', bg: 'rgba(26,26,26,0.04)' },
  Infrastructure: { color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)' },
};

export default function Suppliers({ data, tier }: { data: SuppliersResult; tier: string }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(data.suppliers.map(s => s.category))];
  const filtered = activeCategory ? data.suppliers.filter(s => s.category === activeCategory) : data.suppliers;

  return (
    <div>
      {/* Tier indicator */}
      <div className="rounded-[10px] px-4 py-3 mb-6 flex items-center justify-between" style={{ backgroundColor: 'rgba(26,26,26,0.02)', border: '1px solid var(--divider)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>
          Showing vendors optimized for <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>{tier.toUpperCase()}</span> tier
        </p>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>{data.suppliers.length} vendors</span>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <button onClick={() => setActiveCategory(null)}
          className="rounded-full px-3 py-1.5 transition-all duration-200 whitespace-nowrap"
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 11, border: 'none', cursor: 'pointer',
            backgroundColor: !activeCategory ? 'var(--text-primary)' : 'transparent',
            color: !activeCategory ? '#fff' : 'var(--text-muted)',
            ...(activeCategory ? { border: '1px solid var(--divider)' } : {}),
          }}>All</button>
        {categories.map(cat => {
          const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Operations;
          const isActive = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="rounded-full px-3 py-1.5 transition-all duration-200 whitespace-nowrap"
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, cursor: 'pointer',
                backgroundColor: isActive ? c.bg : 'transparent',
                color: isActive ? c.color : 'var(--text-muted)',
                border: isActive ? `1px solid ${c.color}20` : '1px solid var(--divider)',
              }}>{cat}</button>
          );
        })}
      </div>

      {/* Supplier cards */}
      <div className="flex flex-col gap-2">
        {filtered.map((s, i) => {
          const c = CATEGORY_COLORS[s.category] || CATEGORY_COLORS.Operations;
          return (
            <div key={i} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{s.name}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, letterSpacing: '0.04em', backgroundColor: c.bg, color: c.color }}>{s.category}</span>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8 }}>{s.location}</p>
                </div>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.cost}</span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{s.description}</p>
              <div className="rounded-[8px] p-3 mb-3" style={{ backgroundColor: 'rgba(45,139,117,0.02)', borderLeft: '2px solid var(--accent-teal)' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.why_recommended}</p>
              </div>
              {s.website && (
                <a href={s.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Visit website
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
