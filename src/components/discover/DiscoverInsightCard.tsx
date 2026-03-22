import { useState, useRef, useEffect } from 'react';
import type { DiscoverInsight } from '@/lib/discover';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ScoreDonut from './ScoreDonut';
import ScoreMethodology from './ScoreMethodology';

const TYPE_CONFIG = {
  pain_point: { label: 'PAIN POINT', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
  workaround: { label: 'WORKAROUND', color: 'var(--accent-amber)', bg: 'rgba(212,136,15,0.06)' },
  demand_signal: { label: 'DEMAND SIGNAL', color: 'var(--accent-teal)', bg: 'rgba(45,139,117,0.06)' },
  expectation: { label: 'EXPECTATION', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.06)' },
};

const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  reddit: { icon: '🟠', label: 'Reddit' },
  google: { icon: '🔵', label: 'Google' },
  yelp: { icon: '🔴', label: 'Yelp' },
};

function ScoreBar({ label, value, color, explanation }: { label: string; value: number; color: string; explanation: string }) {
  const pct = Math.round(value * 100);
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="flex-1 min-w-0 relative">
      <div className="flex items-center justify-between mb-1">
        <button
          className="flex items-center gap-1 cursor-help"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onClick={(e) => { e.stopPropagation(); setShowTip(!showTip); }}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
            {label}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6 }}>ⓘ</span>
        </button>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider-light)' }}>
        <div
          className="rounded-full h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 600ms ease-out',
          }}
        />
      </div>
      {/* Tooltip */}
      {showTip && (
        <div
          className="absolute z-20 rounded-[8px] p-3 shadow-lg"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            width: 220,
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--divider)',
            pointerEvents: 'none',
          }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DiscoverInsightCard({ insight }: { insight: DiscoverInsight }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const { setSelectedInsight, setCurrentStep, idea } = useIdea();
  const { user } = useAuth();
  const config = TYPE_CONFIG[insight.type];

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded, showMethodology]);

  const platforms = [...new Set(insight.sources.map(s => s.platform))];

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Sign in to save insights');
      return;
    }
    if (saved) return;

    setSaving(true);
    try {
      // Upsert the saved_idea with this insight added to discover_data
      const { data: existing } = await supabase
        .from('saved_ideas')
        .select('id, discover_data')
        .eq('user_id', user.id)
        .eq('idea_text', idea)
        .maybeSingle();

      const currentInsights = (existing?.discover_data as any)?.saved_insights || [];
      const updatedInsights = [...currentInsights, {
        title: insight.title,
        type: insight.type,
        description: insight.description,
        composite_score: insight.composite_score,
        tags: insight.tags,
        saved_at: new Date().toISOString(),
      }];

      if (existing) {
        await supabase
          .from('saved_ideas')
          .update({
            discover_data: { ...(existing.discover_data as any || {}), saved_insights: updatedInsights },
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('saved_ideas')
          .insert({
            user_id: user.id,
            idea_text: idea,
            discover_data: { saved_insights: updatedInsights },
          });
      }

      setSaved(true);
      toast.success('Insight saved to your account');
    } catch (err) {
      toast.error('Failed to save insight');
    } finally {
      setSaving(false);
    }
  };

  const scoreColor = insight.composite_score >= 7 ? 'var(--accent-teal)' :
    insight.composite_score >= 4 ? 'var(--accent-amber)' : '#EF4444';

  return (
    <div
      className="rounded-[14px] transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface-card)',
        boxShadow: expanded
          ? '0 4px 20px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreDonut score={insight.composite_score} color={config.color} />

          <div className="flex-1 min-w-0">
            {/* Type badge + source chips */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="inline-block rounded-full px-2.5 py-0.5"
                style={{
                  fontSize: 10,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  backgroundColor: config.bg,
                  color: config.color,
                }}
              >
                {config.label}
              </span>

              {platforms.map(p => {
                const meta = PLATFORM_META[p] || { icon: '📌', label: p };
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      fontSize: 10,
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {meta.icon} {meta.label}
                    <span style={{ fontSize: 9 }}>
                      ({insight.sources.filter(s => s.platform === p).length})
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Title */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.45,
            }}>
              {insight.title}
            </p>

            {/* Description */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginTop: 6,
            }}>
              {insight.description}
            </p>

            {/* Score bars with hover explanations */}
            <div className="flex gap-3 mt-4">
              <ScoreBar
                label="Frequency"
                value={insight.frequency_score}
                color={scoreColor}
                explanation="Based on how often this topic appears across Reddit threads, Google reviews, and Yelp — measured by mention count relative to total sources analyzed."
              />
              <ScoreBar
                label="Severity"
                value={insight.severity_score}
                color={scoreColor}
                explanation="Measured by the emotional intensity of language used (frustration, urgency, desperation) and whether users describe it as a dealbreaker or minor annoyance."
              />
              <ScoreBar
                label="Pay Signal"
                value={insight.willingness_to_pay}
                color={scoreColor}
                explanation="Derived from mentions of pricing, budget, willingness to switch services, or explicit statements about paying for better alternatives."
              />
              <ScoreBar
                label="Market Size"
                value={insight.market_size_signal}
                color={scoreColor}
                explanation="Estimated from the breadth of affected users — whether the issue impacts a niche group or is widely discussed across multiple platforms and demographics."
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {insight.tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    fontSize: 11,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    backgroundColor: 'var(--surface-input)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Expand hint */}
            <div className="mt-3 flex items-center gap-1">
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 300,
                color: 'var(--accent-purple)',
              }}>
                {expanded ? '▾ Hide evidence' : `▸ ${insight.sources.length} sources — click to expand`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded evidence */}
      <div
        style={{
          height: expanded ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'height 300ms ease-out',
        }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider)', marginBottom: 16 }} />

          <div className="flex items-center justify-between mb-3">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              EVIDENCE ({insight.sources.length} sources)
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMethodology(!showMethodology); }}
              className="rounded-full px-2.5 py-1 transition-colors duration-150"
              style={{
                fontSize: 10,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                backgroundColor: showMethodology ? 'rgba(108,92,231,0.08)' : 'var(--surface-input)',
                color: showMethodology ? 'var(--accent-purple)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showMethodology ? '✕ Hide methodology' : '📊 How we scored this'}
            </button>
          </div>

          {/* Score methodology panel */}
          {showMethodology && (
            <ScoreMethodology insight={insight} />
          )}

          {/* Source evidence */}
          <div className="flex flex-col gap-3">
            {insight.sources.map((source, i) => {
              const meta = PLATFORM_META[source.platform] || { icon: '📌', label: source.platform };
              return (
                <div
                  key={i}
                  className="rounded-[10px] p-4"
                  style={{ backgroundColor: 'var(--surface-input)' }}
                >
                  <p style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                  }}>
                    "{source.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span style={{ fontSize: 12 }}>{meta.icon}</span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="transition-colors duration-150"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: 'var(--accent-purple)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      {source.author} →
                    </a>
                    {source.upvotes != null && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                        ↑ {source.upvotes}
                      </span>
                    )}
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                      {source.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInsight(insight.title);
                setCurrentStep('analyze');
              }}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                backgroundColor: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Deep dive this opportunity →
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                backgroundColor: saved ? 'rgba(45,139,117,0.08)' : 'var(--surface-input)',
                color: saved ? 'var(--accent-teal)' : 'var(--text-secondary)',
                border: 'none',
                cursor: saving ? 'wait' : saved ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : '★ Save Insight'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
