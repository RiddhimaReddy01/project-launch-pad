import { useState } from 'react';
import type { SuppliersResult, SupplierItem } from '@/lib/setup';

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Engineering: { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  Marketing: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
  Legal: { color: 'hsl(0 84% 60%)', bg: 'rgba(140,96,96,0.06)' },
  Operations: { color: 'var(--text-secondary)', bg: 'rgba(26,26,26,0.04)' },
  Infrastructure: { color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)' },
};

function buildMapsUrl(name: string, location: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + location)}`;
}

export default function Suppliers({ data, tier }: { data: SuppliersResult; tier: string }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(data.suppliers.map(s => s.category))];
  const filtered = activeCategory ? data.suppliers.filter(s => s.category === activeCategory) : data.suppliers;
  const catCounts = categories.map(cat => ({
    cat,
    count: data.suppliers.filter(s => s.category === cat).length,
    ...(CATEGORY_COLORS[cat] || CATEGORY_COLORS.Operations),
  }));
  const totalSuppliers = data.suppliers.length;

  return (
    <div>
      {/* Category distribution */}
      <div className="card-base p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label" style={{ marginBottom: 0 }}>Vendor Distribution</p>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
            {totalSuppliers} vendors / {tier.toUpperCase()} tier
          </span>
        </div>
        <div className="flex rounded-[6px] overflow-hidden" style={{ height: 24 }}>
          {catCounts.map((c) => (
            <div
              key={c.cat}
              style={{ width: `${(c.count / totalSuppliers) * 100}%`, backgroundColor: c.color, opacity: 0.7, transition: 'opacity 200ms', cursor: 'pointer' }}
              className="flex items-center justify-center"
              title={`${c.cat}: ${c.count}`}
              onClick={() => setActiveCategory(activeCategory === c.cat ? null : c.cat)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }}
            >
              {c.count >= 2 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.count}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {catCounts.map((c) => (
            <div key={c.cat} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveCategory(activeCategory === c.cat ? null : c.cat)}>
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.color, opacity: 0.7 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: activeCategory === c.cat ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c.cat} ({c.count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <button onClick={() => setActiveCategory(null)}
          className="rounded-full px-3 py-1.5 transition-all duration-200 whitespace-nowrap"
          style={{
            fontSize: 13, border: 'none', cursor: 'pointer',
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
                fontSize: 13, cursor: 'pointer',
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
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{s.name}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 13, letterSpacing: '0.04em', backgroundColor: c.bg, color: c.color }}>{s.category}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginBottom: 8 }}>{s.location}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.cost}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{s.description}</p>
              <div className="rounded-[8px] p-3 mb-3" style={{ backgroundColor: 'rgba(45,139,117,0.02)', borderLeft: '2px solid var(--accent-teal)' }}>
                <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.why_recommended}</p>
              </div>
              <div className="flex items-center gap-3">
                {s.website && (
                  <a href={s.website} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    Visit website
                  </a>
                )}
                <a href={buildMapsUrl(s.name, s.location)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 transition-all duration-200"
                  style={{ fontSize: 13, color: 'var(--accent-teal)', textDecoration: 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Find near me
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
