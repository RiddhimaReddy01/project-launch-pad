import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type CustomersData } from '@/lib/analyze';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function CustomerSegments({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: CustomersData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: CustomersData | null }) {
  const [data, setData] = useState<CustomersData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number>(0);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('customers', context)
      .then((result) => {
        if (!cancelled) { const d = result as CustomersData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Segmenting your target customers..." section="customers" />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('customers', context).then(r => { setData(r as CustomersData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const seg = data.segments[selected];
  const fmtSize = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  const radarData = [
    { metric: 'Pain', value: seg.pain_intensity * 10 },
    { metric: 'Size', value: Math.min((seg.estimated_size / 50000) * 100, 100) },
    { metric: 'Spending', value: 70 },
    { metric: 'Access', value: 60 },
    { metric: 'Urgency', value: seg.pain_intensity * 8 },
  ];

  return (
    <div>
      {/* Segment selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 hide-scrollbar">
        {data.segments.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="rounded-[8px] px-4 py-2 whitespace-nowrap transition-all duration-200"
            style={{
              fontSize: 12, fontFamily: "'Outfit', sans-serif",
              fontWeight: selected === i ? 400 : 300,
              backgroundColor: selected === i ? 'var(--text-primary)' : 'transparent',
              color: selected === i ? '#fff' : 'var(--text-muted)',
              border: selected === i ? 'none' : '1px solid var(--divider-light)',
              cursor: 'pointer',
            }}
          >
            {s.name}
            <span className="ml-1.5" style={{ fontSize: 10, opacity: 0.7 }}>{s.pain_intensity}/10</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: detail */}
        <div className="flex-1">
          <div className="rounded-[12px] p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 2 }}>{seg.name}</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>~{fmtSize(seg.estimated_size)} people locally</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>{seg.description}</p>

            {/* Pain bar */}
            <div className="mb-5">
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Pain Intensity</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-[2px]" style={{ width: 22, height: 6, backgroundColor: i < seg.pain_intensity ? 'var(--text-primary)' : 'var(--divider)', opacity: i < seg.pain_intensity ? 0.6 + (i * 0.04) : 0.3 }} />
                ))}
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--text-primary)', marginLeft: 8 }}>{seg.pain_intensity}/10</span>
              </div>
            </div>

            {/* Details */}
            {[
              { label: 'Primary Need', value: seg.primary_need, pill: true },
              { label: 'Spending Pattern', value: seg.spending_pattern },
              { label: 'Where to Find Them', value: seg.where_to_find },
            ].map((item) => (
              <div key={item.label} className="mb-4">
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</p>
                {item.pill ? (
                  <span className="rounded-full px-3 py-1" style={{ fontSize: 12, fontFamily: "'Outfit', sans-serif", backgroundColor: 'rgba(26,26,26,0.03)', color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>{item.value}</span>
                ) : (
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: radar + comparison */}
        <div className="lg:w-[280px] flex-shrink-0 flex flex-col gap-3">
          <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>Segment Profile</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--divider)" />
                  <PolarAngleAxis dataKey="metric" style={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Radar dataKey="value" stroke="var(--accent-teal)" fill="var(--accent-teal)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>All Segments</p>
            <div className="flex flex-col gap-1.5">
              {data.segments.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-2 rounded-[6px] cursor-pointer transition-colors duration-150"
                  style={{ backgroundColor: selected === i ? 'rgba(26,26,26,0.03)' : 'transparent' }}
                  onClick={() => setSelected(i)}
                >
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: selected === i ? 400 : 300, color: selected === i ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtSize(s.estimated_size)}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: s.pain_intensity >= 8 ? 'var(--accent-teal)' : s.pain_intensity >= 5 ? 'var(--accent-amber)' : 'hsl(0 84% 60%)' }}>{s.pain_intensity}/10</span>
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
