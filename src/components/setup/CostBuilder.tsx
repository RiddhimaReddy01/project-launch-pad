import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CostsResult, TierDef } from '@/lib/setup';

function formatCurrency(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function CostBuilder({ data, selectedTier, onSelectTier }: { data: CostsResult; selectedTier: string; onSelectTier: (tier: any) => void }) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const tier = data?.tiers?.find(t => t.id === selectedTier);
  const categories = data?.breakdown?.[selectedTier] || [];

  if (!data?.tiers || !data?.breakdown) {
    return <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>Loading cost data...</p>;
  }

  const totalMin = useMemo(() => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.min, 0), 0), [categories]);
  const totalMax = useMemo(() => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.max, 0), 0), [categories]);

  const chartData = categories.map(c => ({
    category: c.category,
    min: c.items.reduce((s, i) => s + i.min, 0),
    range: c.items.reduce((s, i) => s + (i.max - i.min), 0),
  }));

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  };

  return (
    <div>
      {/* Total range banner */}
      <div className="rounded-[12px] p-6 mb-8" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Estimated Launch Cost — {selectedTier.toUpperCase()} Tier
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-heading" style={{ fontSize: 28 }}>{formatCurrency(totalMin)}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>to</span>
          <span className="font-heading" style={{ fontSize: 28 }}>{formatCurrency(totalMax)}</span>
        </div>
        {tier && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>{tier.philosophy}</p>}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-8">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Cost Distribution
          </p>
          <div className="rounded-[12px] p-4" style={{ height: Math.max(180, chartData.length * 40), backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" tickFormatter={formatCurrency} style={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="category" width={100} style={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'min' ? 'Minimum' : 'Range']} />
                <Bar dataKey="min" stackId="cost" radius={[0, 0, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="var(--text-primary)" opacity={0.4 - i * 0.05} />)}
                </Bar>
                <Bar dataKey="range" stackId="cost" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="var(--text-primary)" opacity={0.15} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="flex flex-col gap-2">
        {categories.map(cat => {
          const isOpen = expandedCats.has(cat.category);
          const catMin = cat.items.reduce((s, i) => s + i.min, 0);
          const catMax = cat.items.reduce((s, i) => s + i.max, 0);
          return (
            <div key={cat.category} className="rounded-[12px]" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
              <button onClick={() => toggleCat(cat.category)} className="w-full text-left p-4 flex items-center justify-between"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{cat.category}</p>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
                    {formatCurrency(catMin)} – {formatCurrency(catMax)}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}/>
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 12 }} />
                  {cat.items.map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 px-2 rounded-[6px]">
                      <div className="flex-1">
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>{item.label}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 2 }}>{item.note}</p>
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginLeft: 16 }}>
                        {formatCurrency(item.min)} – {formatCurrency(item.max)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
