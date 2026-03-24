import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type LocationData } from '@/lib/analyze';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionSkeleton from './SectionSkeleton';

export default function LocationIntel({ context, onData, onError, shouldRun = true }: { context: AnalyzeContext; onData?: (data: LocationData) => void; onError?: (error: string) => void; shouldRun?: boolean }) {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyzeSection('location', context)
      .then((result) => {
        if (!cancelled) { const d = result as LocationData; setData(d); onData?.(d); setLoading(false); }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); onError?.(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shouldRun]);

  if (loading) return <SectionSkeleton label="Analyzing location data..." />;
  if (error) return (
    <div className="text-center py-12">
      <p style={{ fontSize: 14, color: 'hsl(0 84% 60%)', marginBottom: 12 }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(null); analyzeSection('location', context).then(r => { setData(r as LocationData); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
        className="rounded-[10px] px-4 py-2" style={{ backgroundColor: 'var(--text-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  );
  if (!data) return null;

  const fmtNum = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toString();
  const fmtDollar = (v: number) => v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`;

  const demoData = [
    { label: 'Population', value: data.demographics.population },
    { label: 'Median Income', value: data.demographics.median_income },
    { label: 'Median Age', value: data.demographics.median_age },
  ];

  const scoreColor = data.score >= 7 ? 'var(--accent-teal)' : data.score >= 4 ? 'var(--accent-amber)' : 'hsl(0 84% 60%)';

  return (
    <div>
      {/* Location score */}
      <div className="rounded-[12px] p-6 mb-8 flex items-center gap-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 400, color: scoreColor }}>{data.score}</span>
        </div>
        <div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: scoreColor, marginBottom: 4 }}>Location Score</p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.verdict}</p>
        </div>
      </div>

      {/* Demographics grid */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Demographics</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          <StatCard label="Population" value={fmtNum(data.demographics.population)} />
          <StatCard label="Median Income" value={fmtDollar(data.demographics.median_income)} />
          <StatCard label="Median Age" value={data.demographics.median_age.toString()} />
          <StatCard label="Growth Rate" value={data.demographics.growth_rate} />
        </div>
      </div>

      {/* Foot traffic */}
      <div className="mb-8">
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Foot Traffic & Real Estate</p>
        <div className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <div className="flex flex-col gap-4">
            <div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Best Areas</p>
              <div className="flex flex-wrap gap-2">
                {data.foot_traffic.best_areas.map((area, i) => (
                  <span key={i} className="rounded-full px-3 py-1" style={{ fontSize: 12, fontFamily: "'Outfit', sans-serif", backgroundColor: 'rgba(26,26,26,0.03)', color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>{area}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-8">
              <div>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Avg Rent /sqft</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>${data.foot_traffic.avg_monthly_rent_sqft}</p>
              </div>
              <div>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Competitor Density</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>{data.foot_traffic.competitor_density}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory */}
      <div>
        <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Regulatory & Permits</p>
        <div className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <div className="flex flex-col gap-3">
            <div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Key Permits Required</p>
              <div className="flex flex-col gap-1.5">
                {data.regulatory.key_permits.map((permit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>{permit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-8 pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
              <div>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Timeline</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{data.regulatory.estimated_timeline}</p>
              </div>
            </div>
            {data.regulatory.notes && (
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>{data.regulatory.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 400, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
