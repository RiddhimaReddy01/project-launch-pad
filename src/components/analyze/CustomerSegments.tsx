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
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 hide-scrollbar">
        {data.segments.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="rounded-[8px] px-5 py-2.5 whitespace-nowrap transition-all duration-200"
            style={{
              fontSize: 14,
              fontWeight: selected === i ? 500 : 400,
              backgroundColor: selected === i ? 'var(--text-primary)' : 'transparent',
              color: selected === i ? '#fff' : 'var(--text-muted)',
              border: selected === i ? 'none' : '1px solid var(--divider-light)',
              cursor: 'pointer',
            }}
          >
            {s.name}
            <span className="ml-1.5" style={{ fontSize: 14, opacity: 0.75 }}>{s.pain_intensity}/10</span>
          </button>
        ))}
      </div>

      <div
        className="rounded-[12px] flex flex-col lg:flex-row lg:items-stretch overflow-hidden"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}
      >
        <div className="flex-1 min-w-0 p-6 lg:p-8 lg:pr-6">
          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.25 }}>{seg.name}</h3>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 16 }}>~{fmtSize(seg.estimated_size)} people locally</p>
          <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>{seg.description}</p>

          <div className="mb-6">
            <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Pain Intensity</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[3px]"
                  style={{
                    width: 28,
                    height: 8,
                    backgroundColor: i < seg.pain_intensity ? 'var(--text-primary)' : 'var(--divider)',
                    opacity: i < seg.pain_intensity ? 0.55 + (i * 0.04) : 0.35,
                  }}
                />
              ))}
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginLeft: 10 }}>{seg.pain_intensity}/10</span>
            </div>
          </div>

          <div className="mb-6">
            <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Primary Need</p>
            <span
              className="inline-block rounded-full px-5 py-2.5"
              style={{
                fontSize: 16,
                fontWeight: 500,
                backgroundColor: 'rgba(26,26,26,0.06)',
                color: 'var(--text-primary)',
                border: '1px solid var(--divider)',
                lineHeight: 1.35,
              }}
            >
              {seg.primary_need}
            </span>
          </div>

          <div className="mb-5">
            <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Spending Pattern</p>
            <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{seg.spending_pattern}</p>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Where to Find Them</p>
            <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{seg.where_to_find}</p>
          </div>
        </div>

        <div
          className="lg:w-[320px] flex-shrink-0 flex flex-col items-center justify-center px-4 pb-8 pt-2 lg:py-8 lg:pl-4 lg:pr-8 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: 'var(--divider)' }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            Segment Profile
          </p>
          <div className="w-full max-w-[300px] mx-auto" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="var(--divider)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 14, fill: 'var(--text-muted)', fontWeight: 500 }}
                />
                <Radar dataKey="value" stroke="var(--accent-teal)" fill="var(--accent-teal)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
