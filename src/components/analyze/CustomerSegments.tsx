import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CustomersData } from '@/lib/analyze';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function CustomerSegments({ context, onData }: { context: AnalyzeContext; onData?: (data: CustomersData) => void }) {
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    analyzeSection('customers', context)
      .then((result) => {
        if (!cancelled) {
          const d = result as CustomersData;
          setData(d);
          onData?.(d);
          setLoading(false);
        }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SectionSkeleton label="Segmenting your target customers..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'var(--destructive)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('customers', context).then(r => { setData(r as CustomersData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const seg = data.segments[selected];
  const fmtSize = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  // Radar data for selected segment
  const radarData = [
    { metric: 'Pain', value: seg.pain_intensity * 10 },
    { metric: 'Size', value: Math.min((seg.estimated_size / 50000) * 100, 100) },
    { metric: 'Spending', value: 70 }, // Derived from spending_pattern text
    { metric: 'Accessibility', value: 60 },
    { metric: 'Urgency', value: seg.pain_intensity * 8 },
  ];

  return (
    <div>
      {/* Segment selector pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {data.segments.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="rounded-[10px] px-4 py-2 whitespace-nowrap transition-all duration-200"
            style={{
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              fontWeight: selected === i ? 400 : 300,
              backgroundColor: selected === i ? 'var(--accent-purple)' : 'var(--surface-input)',
              color: selected === i ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {s.name}
            <span className="ml-1.5 rounded-full px-1.5 py-0.5" style={{ fontSize: 10, backgroundColor: selected === i ? 'rgba(255,255,255,0.2)' : 'var(--divider-light)', color: selected === i ? '#fff' : 'var(--text-muted)' }}>
              {s.pain_intensity}/10
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Segment detail */}
        <div className="flex-1">
          <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{seg.name}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--accent-purple)', marginBottom: 12 }}>~{fmtSize(seg.estimated_size)} people locally</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>{seg.description}</p>

            {/* Pain intensity bar */}
            <div className="mb-5">
              <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 6 }}>PAIN INTENSITY</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-[2px]" style={{ width: 22, height: 8, backgroundColor: i < seg.pain_intensity ? 'var(--accent-purple)' : 'var(--divider)', opacity: i < seg.pain_intensity ? 0.75 : 0.4 }} />
                ))}
                <span className="font-caption ml-2" style={{ fontSize: 13 }}>{seg.pain_intensity}/10</span>
              </div>
            </div>

            {/* Primary need */}
            <div className="mb-5">
              <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 6 }}>PRIMARY NEED</p>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", backgroundColor: 'rgba(108,92,231,0.06)', color: 'var(--accent-purple)' }}>{seg.primary_need}</span>
            </div>

            {/* Spending */}
            <div className="mb-5">
              <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 6 }}>SPENDING PATTERN</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{seg.spending_pattern}</p>
            </div>

            {/* Where to find */}
            <div>
              <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 6 }}>WHERE TO FIND THEM</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{seg.where_to_find}</p>
            </div>
          </div>
        </div>

        {/* Right: Radar chart */}
        <div className="lg:w-[300px] flex-shrink-0">
          <div className="rounded-[14px] p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="font-caption text-center" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 8 }}>SEGMENT PROFILE</p>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--divider-light)" />
                  <PolarAngleAxis dataKey="metric" style={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Radar dataKey="value" stroke="var(--accent-purple)" fill="var(--accent-purple)" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-4 rounded-[14px] p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.04em', marginBottom: 8 }}>ALL SEGMENTS</p>
            <div className="flex flex-col gap-2">
              {data.segments.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-2 rounded-[6px] cursor-pointer transition-colors duration-150"
                  style={{ backgroundColor: selected === i ? 'rgba(108,92,231,0.04)' : 'transparent' }}
                  onClick={() => setSelected(i)}
                >
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: selected === i ? 400 : 300, color: selected === i ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtSize(s.estimated_size)}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: s.pain_intensity >= 8 ? 'var(--accent-teal)' : s.pain_intensity >= 5 ? 'var(--accent-amber)' : '#EF4444' }}>{s.pain_intensity}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
