import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { CostsResult, TierDef } from '@/lib/setup';

function formatCurrency(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

const PIE_COLORS = ['var(--accent-primary)', 'var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-teal)', 'var(--accent-purple)', 'var(--text-secondary)'];

export default function CostBuilder({ data, selectedTier, onSelectTier }: { data: CostsResult; selectedTier: string; onSelectTier: (tier: any) => void }) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');

  const tier = data?.tiers?.find(t => t.id === selectedTier);
  const categories = data?.breakdown?.[selectedTier] || [];

  const totalMin = useMemo(() => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.min, 0), 0), [categories]);
  const totalMax = useMemo(() => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.max, 0), 0), [categories]);

  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [['Category', 'Item', 'Min ($)', 'Max ($)', 'Notes']];
    categories.forEach(c => c.items.forEach(i => {
      rows.push([c.category, i.label, String(i.min), String(i.max), i.note]);
    }));
    rows.push([]);
    rows.push(['TOTAL', '', String(totalMin), String(totalMax), `${selectedTier.toUpperCase()} Tier`]);
    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `launch-lean-budget-${selectedTier}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [categories, totalMin, totalMax, selectedTier]);

  if (!data?.tiers || !data?.breakdown) {
    return <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>Loading cost data...</p>;
  }

  const chartData = categories.map(c => ({
    category: c.category,
    min: c.items.reduce((s, i) => s + i.min, 0),
    range: c.items.reduce((s, i) => s + (i.max - i.min), 0),
    avg: c.items.reduce((s, i) => s + (i.min + i.max) / 2, 0),
  }));

  const pieData = chartData.map((c, i) => ({
    name: c.category,
    value: c.avg,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  };

  return (
    <div>
      {/* Total range banner */}
      <div className="card-base p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">
            Estimated Launch Cost -- {selectedTier.toUpperCase()} Tier
          </p>
          <button onClick={handleExportCSV} className="btn-secondary rounded-[6px] px-3 py-1.5" style={{ fontSize: 11 }}>
            Download Spreadsheet
          </button>
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-heading" style={{ fontSize: 28 }}>{formatCurrency(totalMin)}</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>to</span>
          <span className="font-heading" style={{ fontSize: 28 }}>{formatCurrency(totalMax)}</span>
        </div>
        {tier && <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.6 }}>{tier.philosophy}</p>}
      </div>

      {/* Chart toggle + visualization */}
      {chartData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Cost Distribution</p>
            <div className="flex gap-1">
              {(['bar', 'pie'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="rounded-[6px] px-2.5 py-1 transition-all duration-200"
                  style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: 11,
                    backgroundColor: viewMode === mode ? 'var(--text-primary)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                    border: viewMode === mode ? 'none' : '1px solid var(--divider-light)',
                    cursor: 'pointer',
                  }}>
                  {mode === 'bar' ? 'Bar' : 'Pie'}
                </button>
              ))}
            </div>
          </div>

          <div className="card-base p-4" style={{ height: viewMode === 'bar' ? Math.max(180, chartData.length * 40) : 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'bar' ? (
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" tickFormatter={formatCurrency} style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" width={100} style={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'min' ? 'Minimum' : 'Range']} />
                  <Bar dataKey="min" stackId="cost" radius={[0, 0, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="var(--accent-primary)" opacity={0.5 - i * 0.04} />)}
                  </Bar>
                  <Bar dataKey="range" stackId="cost" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="var(--accent-primary)" opacity={0.15} />)}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 9, fontFamily: "'Outfit', sans-serif" }}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.7} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              )}
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
            <div key={cat.category} className="card-base">
              <button onClick={() => toggleCat(cat.category)} className="w-full text-left p-4 flex items-center justify-between"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{cat.category}</p>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
                    {formatCurrency(catMin)} -- {formatCurrency(catMax)}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}/>
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 animate-fade-in">
                  <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 12 }} />
                  {cat.items.map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 px-2 rounded-[6px]">
                      <div className="flex-1">
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>{item.label}</p>
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginTop: 2 }}>{item.note}</p>
                      </div>
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginLeft: 16 }}>
                        {formatCurrency(item.min)} -- {formatCurrency(item.max)}
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
