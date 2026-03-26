import { useState, useEffect } from 'react';
import { analyzeSection, type AnalyzeContext, type LocationData } from '@/lib/analyze';
import SectionSkeleton from './SectionSkeleton';

export default function LocationIntel({ context, onData, onError, shouldRun = true, initialData }: { context: AnalyzeContext; onData?: (data: LocationData) => void; onError?: (error: string) => void; shouldRun?: boolean; initialData?: LocationData | null }) {
  const [data, setData] = useState<LocationData | null>(initialData ?? null);
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

  if (loading) return <SectionSkeleton label="Analyzing location data..." section="location" />;
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

      {/* Map panel */}
      {data.city_center && data.focus_areas && data.focus_areas.length > 0 && (
        <div className="mb-8">
          <p className="font-caption" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Location Map</p>
          <LocationMap data={data} scoreColor={scoreColor} />
        </div>
      )}

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

function LocationMap({ data, scoreColor }: { data: LocationData; scoreColor: string }) {
  const center = data.city_center;
  const areas = data.focus_areas || [];
  if (!center || areas.length === 0) return null;

  const allLats = [center.lat, ...areas.map((area) => area.lat)];
  const allLngs = [center.lng, ...areas.map((area) => area.lng)];
  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);
  const latSpan = Math.max(0.02, maxLat - minLat);
  const lngSpan = Math.max(0.02, maxLng - minLng);

  const project = (lat: number, lng: number) => {
    const x = 40 + ((lng - minLng) / lngSpan) * 520;
    const y = 40 + ((maxLat - lat) / latSpan) * 220;
    return { x, y };
  };

  const emphasisStyle = (emphasis: string) => {
    if (emphasis === 'high') return { r: 11, fill: scoreColor, opacity: 0.95 };
    if (emphasis === 'low') return { r: 7, fill: 'var(--text-muted)', opacity: 0.65 };
    return { r: 9, fill: 'var(--accent-blue)', opacity: 0.85 };
  };

  const centerPoint = project(center.lat, center.lng);

  return (
    <div className="rounded-[16px] p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{center.label}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Focus areas are positioned relative to the city center so you can compare where the strongest launch opportunities cluster.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <span key={area.name} className="badge badge-muted" title={area.reason}>
              {area.name}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--surface-subtle)' }}>
        <svg viewBox="0 0 600 300" style={{ display: 'block', width: '100%', height: 'auto' }} role="img" aria-label={`Map of ${center.label}`}>
          <rect x="0" y="0" width="600" height="300" fill="var(--surface-subtle)" />
          <path d="M40 220 C120 130, 220 130, 280 195 S440 245, 560 120" stroke="rgba(60,64,67,0.14)" strokeWidth="18" fill="none" strokeLinecap="round" />
          <path d="M70 70 C190 30, 330 60, 540 50" stroke="rgba(60,64,67,0.08)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <circle cx={centerPoint.x} cy={centerPoint.y} r="10" fill="var(--text-primary)" />
          <circle cx={centerPoint.x} cy={centerPoint.y} r="22" fill="var(--text-primary)" opacity="0.08" />
          <text x={centerPoint.x + 14} y={centerPoint.y - 12} style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text-primary)' }}>
            City center
          </text>

          {areas.map((area) => {
            const point = project(area.lat, area.lng);
            const style = emphasisStyle(area.emphasis);
            return (
              <g key={area.name}>
                <circle cx={point.x} cy={point.y} r={style.r + 10} fill={style.fill} opacity="0.10" />
                <circle cx={point.x} cy={point.y} r={style.r} fill={style.fill} opacity={style.opacity} />
                <line x1={point.x} y1={point.y} x2={point.x + 16} y2={point.y - 16} stroke={style.fill} strokeWidth="1.5" opacity="0.7" />
                <text x={point.x + 20} y={point.y - 18} style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-primary)' }}>
                  {area.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {areas.map((area) => (
          <div key={area.name} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--divider)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: area.emphasis === 'high' ? scoreColor : area.emphasis === 'medium' ? 'var(--accent-blue)' : 'var(--text-muted)',
                flexShrink: 0,
              }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{area.name}</p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {area.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
