import { useState, useRef, useEffect, useMemo, type MouseEvent } from 'react';
import type { DiscoverInsight } from '@/lib/discover';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ScoreDonut from './ScoreDonut';
import ScoreMethodology from './ScoreMethodology';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pain_point: { label: 'PAIN POINT', color: 'var(--error)', bg: 'rgba(193,72,61,0.08)' },
  workaround: { label: 'WORKAROUND', color: 'var(--accent-amber)', bg: 'rgba(195,138,46,0.10)' },
  demand_signal: { label: 'DEMAND SIGNAL', color: 'var(--accent-primary)', bg: 'rgba(224,90,71,0.10)' },
  expectation: { label: 'EXPECTATION', color: 'var(--accent-blue)', bg: 'rgba(94,126,166,0.10)' },
  market_gap: { label: 'MARKET GAP', color: 'var(--accent-primary)', bg: 'rgba(224,90,71,0.10)' },
  opportunity: { label: 'OPPORTUNITY', color: 'var(--accent-blue)', bg: 'rgba(94,126,166,0.10)' },
  trend: { label: 'TREND', color: 'var(--accent-purple)', bg: 'rgba(125,107,168,0.10)' },
};

const DEFAULT_TYPE_CONFIG = {
  label: 'INSIGHT',
  color: 'var(--text-muted)',
  bg: 'var(--surface-elevated)',
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
}

const PLATFORM_META: Record<string, { label: string; chipClass: string }> = {
  reddit: { label: 'Reddit', chipClass: 'source-chip-reddit' },
  google: { label: 'Google', chipClass: 'source-chip-google' },
  yelp: { label: 'Yelp', chipClass: 'source-chip-yelp' },
};

function normalizeMetric(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 10 : parsed));
}

function normalizeComposite(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(10, parsed <= 1 ? parsed * 10 : parsed));
}

function ScoreBar({
  label,
  value,
  color,
  explanation,
}: {
  label: string;
  value: number;
  color: string;
  explanation: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="flex-1 min-w-0 relative">
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          className="flex items-center gap-1 cursor-help"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onClick={(e) => {
            e.stopPropagation();
            setShowTip(!showTip);
          }}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        </button>

        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>

      <div
        className="rounded-full overflow-hidden"
        style={{ height: 4, backgroundColor: 'var(--divider)' }}
      >
        <div
          className="rounded-full h-full animate-progress"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 600ms ease-out',
          }}
        />
      </div>

      {showTip && (
        <div
          className="absolute z-20 rounded-lg p-3"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            width: 220,
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--divider)',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}

function NoteInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note about this insight..."
        rows={2}
        className="w-full resize-none"
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          lineHeight: 1.6,
        }}
      />

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            if (text.trim()) onSubmit(text.trim());
          }}
          disabled={!text.trim()}
          className="btn-primary rounded-lg disabled:opacity-40"
          style={{ fontSize: 13, fontWeight: 600, padding: '5px 14px' }}
        >
          Save note
        </button>
      </div>
    </div>
  );
}

export default function DiscoverInsightCard({ insight }: { insight: DiscoverInsight }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const { setSelectedInsight, setCurrentStep, idea } = useIdea();
  const { user } = useAuth();

  const config = getTypeConfig(insight.type);

  const safeSources = Array.isArray(insight.sources) ? insight.sources : [];
  const safeTags = Array.isArray(insight.tags) ? insight.tags : [];

  const compositeScore = normalizeComposite(insight.composite_score);
  const frequencyScore = normalizeMetric(insight.frequency_score);
  const severityScore = normalizeMetric(insight.severity_score);
  const paySignal = normalizeMetric(insight.willingness_to_pay);
  const marketSizeSignal = normalizeMetric(insight.market_size_signal);

  const platformCounts = useMemo(() => {
    return safeSources.reduce((acc, source) => {
      const key = source?.platform || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [safeSources]);

  const handlePin = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Sign in to pin insights');
      return;
    }

    if (saved) return;

    setSaving(true);

    try {
      await supabase.from('saved_insights').insert({
        user_id: user.id,
        title: insight.title,
        content: insight.description,
        section_type: 'discover',
        tags: safeTags,
        source_data: JSON.parse(
          JSON.stringify({
            type: insight.type,
            composite_score: compositeScore,
            frequency_score: frequencyScore,
            severity_score: severityScore,
            sources_count: safeSources.length,
          }),
        ),
      } as any);

      setSaved(true);
      toast.success('Insight pinned');
    } catch {
      toast.error('Failed to pin');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!user) {
      toast.error('Sign in to add notes');
      return;
    }

    try {
      const { data: project } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('idea_text', idea)
        .maybeSingle();

      if (project) {
        await supabase.from('project_notes').insert({
          user_id: user.id,
          project_id: project.id,
          content: `[Discover - ${insight.title}] ${note}`,
        } as any);
      }

      setNoteSaved(true);
      setShowNoteInput(false);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const scoreColor =
    compositeScore >= 7
      ? 'var(--signal-high)'
      : compositeScore >= 4
        ? 'var(--signal-medium)'
        : 'var(--signal-low)';

  return (
    <div
      className="rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--divider)',
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, textarea')) return;
        setExpanded((prev) => !prev);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider-section)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreDonut score={compositeScore} color={config.color} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span
                className="badge"
                style={{
                  backgroundColor: config.bg,
                  color: config.color,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                {config.label}
              </span>

              {Object.entries(platformCounts).map(([platform, count]) => {
                const meta = PLATFORM_META[platform] || {
                  label: platform,
                  chipClass: 'badge-muted',
                };

                const firstSource = safeSources.find((s) => s?.platform === platform);
                const sourceUrl = firstSource?.url;
                const hasUrl = !!sourceUrl && sourceUrl !== '#';

                return hasUrl ? (
                  <a
                    key={platform}
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`source-chip ${meta.chipClass}`}
                    style={{ fontWeight: 600 }}
                    title={`View ${count} ${meta.label} source${count > 1 ? 's' : ''}`}
                  >
                    {meta.label}
                    <span style={{ fontSize: 13, opacity: 0.7 }}>({count})</span>
                  </a>
                ) : (
                  <span
                    key={platform}
                    className="badge badge-muted"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {meta.label} ({count})
                  </span>
                );
              })}
            </div>

            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              {insight.title}
            </p>

            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              {insight.description}
            </p>

            <div className="flex gap-3 mt-4">
              <ScoreBar
                label="Frequency"
                value={frequencyScore}
                color={scoreColor}
                explanation="How often this topic appears across sources."
              />
              <ScoreBar
                label="Severity"
                value={severityScore}
                color={scoreColor}
                explanation="Emotional intensity of language used."
              />
              <ScoreBar
                label="Pay Signal"
                value={paySignal}
                color={scoreColor}
                explanation="Mentions of pricing, budget, willingness to switch."
              />
              <ScoreBar
                label="Market Size"
                value={marketSizeSignal}
                color={scoreColor}
                explanation="Breadth of affected users across platforms."
              />
            </div>

            {safeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {safeTags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="badge badge-muted"
                    style={{ fontWeight: 600, fontSize: 13 }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                }}
                title="Click this insight card to open the supporting evidence and source links"
              >
                {expanded ? 'Hide evidence' : `${safeSources.length} sources - click to expand`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-[1200px]' : 'max-h-0'
        }`}
      >
        <div className="px-5 pb-5">
          <div
            style={{
              height: 1,
              backgroundColor: 'var(--divider-section)',
              marginBottom: 16,
            }}
          />

          <div className="flex items-center justify-between mb-4">
            <p className="section-label" style={{ fontWeight: 700, margin: 0 }}>
              EVIDENCE ({safeSources.length} sources)
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMethodology((prev) => !prev);
              }}
              className="btn-secondary rounded-lg"
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px' }}
            >
              {showMethodology ? 'Hide methodology' : 'How we scored this'}
            </button>
          </div>

          {showMethodology && (
            <div onClick={(e) => e.stopPropagation()}>
              <ScoreMethodology
                insight={{
                  ...insight,
                  frequency_score: frequencyScore,
                  severity_score: severityScore,
                  willingness_to_pay: paySignal,
                  market_size_signal: marketSizeSignal,
                  composite_score: compositeScore,
                  sources: safeSources,
                  tags: safeTags,
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 stagger-children">
            {safeSources.map((source, i) => {
              const platform = source?.platform || 'unknown';
              const meta = PLATFORM_META[platform] || {
                label: platform,
                chipClass: 'badge-muted',
              };

              const hasUrl = !!source?.url && source.url !== '#';

              return (
                <div
                  key={`${platform}-${source?.url || i}-${i}`}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    border: '1px solid var(--divider)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.75,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    "{source?.text || 'No source text available'}"
                  </p>

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {hasUrl ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`source-chip ${meta.chipClass}`}
                        style={{ fontWeight: 600 }}
                      >
                        {meta.label}
                      </a>
                    ) : (
                      <span className="badge badge-muted" style={{ fontWeight: 600 }}>
                        {meta.label}
                      </span>
                    )}

                    {hasUrl && source?.author ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                        }}
                      >
                        {source.author}
                      </a>
                    ) : source?.author ? (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {source.author}
                      </span>
                    ) : null}

                    {source?.upvotes != null && (
                      <span className="badge badge-green" style={{ fontSize: 13, fontWeight: 600 }}>
                        +{source.upvotes}
                      </span>
                    )}

                    {source?.date && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {source.date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showNoteInput && (
            <NoteInput
              onSubmit={handleAddNote}
              onCancel={() => setShowNoteInput(false)}
            />
          )}

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInsight(insight.title);
                setCurrentStep('analyze');
              }}
              className="btn-primary rounded-xl px-5 py-2.5"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Deep dive this opportunity
            </button>

            <button
              type="button"
              onClick={handlePin}
              disabled={saving || saved}
              className="btn-secondary rounded-xl px-4 py-2.5"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: saved ? 'var(--accent-primary)' : undefined,
                backgroundColor: saved ? 'rgba(224,90,71,0.08)' : undefined,
                borderColor: saved ? 'var(--accent-primary)' : undefined,
              }}
            >
              {saved ? 'Pinned' : saving ? 'Pinning...' : 'Pin Insight'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNoteInput((prev) => !prev);
              }}
              className="btn-secondary rounded-xl px-4 py-2.5"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: noteSaved ? 'var(--accent-primary)' : undefined,
                backgroundColor: noteSaved ? 'rgba(224,90,71,0.08)' : undefined,
              }}
            >
              {noteSaved ? 'Note added' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}