import { useState, useRef, useEffect } from 'react';
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

const DEFAULT_TYPE_CONFIG = { label: 'INSIGHT', color: 'var(--text-muted)', bg: 'var(--surface-elevated)' };
function getTypeConfig(type: string) { return TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG; }

const PLATFORM_META: Record<string, { label: string; chipClass: string }> = {
  reddit: { label: 'Reddit', chipClass: 'source-chip-reddit' },
  google: { label: 'Google', chipClass: 'source-chip-google' },
  yelp: { label: 'Yelp', chipClass: 'source-chip-yelp' },
};

function ScoreBar({ label, value, color, explanation }: { label: string; value: number; color: string; explanation: string }) {
  const pct = Math.round(value * 100);
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="flex-1 min-w-0 relative">
      <div className="flex items-center justify-between mb-1.5">
        <button
          className="flex items-center gap-1 cursor-help"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onClick={(e) => { e.stopPropagation(); setShowTip(!showTip); }}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</span>
        </button>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{pct}%</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider)' }}>
        <div className="rounded-full h-full animate-progress" style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 600ms ease-out' }} />
      </div>
      {showTip && (
        <div className="absolute z-20 rounded-lg p-3" style={{
          bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, width: 220,
          backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--divider)', pointerEvents: 'none',
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}

function NoteInput({ onSubmit, onCancel }: { onSubmit: (note: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }} onClick={(e) => e.stopPropagation()}>
      <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Add a note about this insight..." rows={2}
        className="w-full resize-none" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', outline: 'none', lineHeight: 1.6 }} />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => { if (text.trim()) onSubmit(text.trim()); }} disabled={!text.trim()} className="btn-primary rounded-lg disabled:opacity-40" style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px' }}>
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const { setSelectedInsight, setCurrentStep, idea } = useIdea();
  const { user } = useAuth();
  const config = getTypeConfig(insight.type);

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded, showMethodology, showNoteInput]);

  const platformCounts = (insight.sources || []).reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to pin insights'); return; }
    if (saved) return;
    setSaving(true);
    try {
      await supabase.from('saved_insights').insert({
        user_id: user.id, title: insight.title, content: insight.description,
        section_type: 'discover', tags: insight.tags,
        source_data: JSON.parse(JSON.stringify({
          type: insight.type, composite_score: insight.composite_score,
          frequency_score: insight.frequency_score, severity_score: insight.severity_score,
          sources_count: insight.sources.length,
        })),
      } as any);
      setSaved(true);
      toast.success('Insight pinned');
    } catch { toast.error('Failed to pin'); }
    finally { setSaving(false); }
  };

  const handleAddNote = async (note: string) => {
    if (!user) { toast.error('Sign in to add notes'); return; }
    try {
      const { data: project } = await supabase.from('saved_ideas').select('id').eq('user_id', user.id).eq('idea_text', idea).maybeSingle();
      if (project) {
        await supabase.from('project_notes').insert({ user_id: user.id, project_id: project.id, content: `[Discover - ${insight.title}] ${note}` } as any);
      }
      setNoteSaved(true);
      setShowNoteInput(false);
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const scoreColor = insight.composite_score >= 7 ? 'var(--signal-high)' :
    insight.composite_score >= 4 ? 'var(--signal-medium)' : 'var(--signal-low)';

  return (
    <div
      className="rounded-xl transition-all duration-200 cursor-pointer"
      style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreDonut score={insight.composite_score} color={config.color} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="badge" style={{ backgroundColor: config.bg, color: config.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                {config.label}
              </span>
              {Object.entries(platformCounts).map(([platform, count]) => {
                const meta = PLATFORM_META[platform] || { label: platform, chipClass: 'badge-muted' };
                const sourceUrl = insight.sources.find(s => s.platform === platform)?.url;
                const hasUrl = sourceUrl && sourceUrl !== '#';
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
                    <span style={{ fontSize: 9, opacity: 0.7 }}>({count})</span>
                  </a>
                ) : (
                  <span key={platform} className="badge badge-muted" style={{ fontSize: 10, fontWeight: 600 }}>
                    {meta.label} ({count})
                  </span>
                );
              })}
            </div>

            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {insight.title}
            </p>

            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>
              {insight.description}
            </p>

            <div className="flex gap-3 mt-4">
              <ScoreBar label="Frequency" value={insight.frequency_score} color={scoreColor} explanation="How often this topic appears across sources." />
              <ScoreBar label="Severity" value={insight.severity_score} color={scoreColor} explanation="Emotional intensity of language used." />
              <ScoreBar label="Pay Signal" value={insight.willingness_to_pay} color={scoreColor} explanation="Mentions of pricing, budget, willingness to switch." />
              <ScoreBar label="Market Size" value={insight.market_size_signal} color={scoreColor} explanation="Breadth of affected users across platforms." />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {insight.tags.map((tag, i) => (
                <span key={i} className="badge badge-muted" style={{ fontWeight: 600 }}>{tag}</span>
              ))}
            </div>

            <div className="mt-3">
              <span
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}
                title="Click this insight card to open the supporting evidence and source links"
              >
                {expanded ? 'Hide evidence' : `${insight.sources.length} sources - click to expand`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: expanded ? contentHeight : 0, overflow: 'hidden', transition: 'height 300ms ease-out' }}>
        <div ref={contentRef} className="px-5 pb-5">
          <div style={{ height: 1, backgroundColor: 'var(--divider-section)', marginBottom: 16 }} />

          <div className="flex items-center justify-between mb-4">
            <p className="section-label" style={{ fontWeight: 700 }}>EVIDENCE ({insight.sources.length} sources)</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMethodology(!showMethodology); }}
              className="btn-secondary rounded-lg" style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px' }}
            >
              {showMethodology ? 'Hide methodology' : 'How we scored this'}
            </button>
          </div>

          {showMethodology && <ScoreMethodology insight={insight} />}

          <div className="flex flex-col gap-3 stagger-children">
            {insight.sources.map((source, i) => {
              const meta = PLATFORM_META[source.platform] || { label: source.platform, chipClass: 'badge-muted' };
              const hasUrl = source.url && source.url !== '#';
              return (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--divider)' }}>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', fontWeight: 500 }}>
                    "{source.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {hasUrl ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className={`source-chip ${meta.chipClass}`} style={{ fontWeight: 600 }}>{meta.label}</a>
                    ) : (
                      <span className="badge badge-muted" style={{ fontWeight: 600 }}>{meta.label}</span>
                    )}
                    {hasUrl && source.author ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                        {source.author}
                      </a>
                    ) : source.author ? (
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{source.author}</span>
                    ) : null}
                    {source.upvotes != null && (
                      <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 600 }}>+{source.upvotes}</span>
                    )}
                    {source.date && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{source.date}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {showNoteInput && <NoteInput onSubmit={handleAddNote} onCancel={() => setShowNoteInput(false)} />}

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedInsight(insight.title); setCurrentStep('analyze'); }}
              className="btn-primary rounded-xl px-5 py-2.5" style={{ fontSize: 13, fontWeight: 600 }}
            >
              Deep dive this opportunity
            </button>
            <button onClick={handlePin} disabled={saving || saved} className="btn-secondary rounded-xl px-4 py-2.5"
              style={{ fontSize: 13, fontWeight: 600, color: saved ? 'var(--accent-primary)' : undefined, backgroundColor: saved ? 'rgba(224,90,71,0.08)' : undefined, borderColor: saved ? 'var(--accent-primary)' : undefined }}>
              {saved ? 'Pinned' : saving ? 'Pinning...' : 'Pin Insight'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNoteInput(!showNoteInput); }}
              className="btn-secondary rounded-xl px-4 py-2.5"
              style={{ fontSize: 13, fontWeight: 600, color: noteSaved ? 'var(--accent-primary)' : undefined, backgroundColor: noteSaved ? 'rgba(224,90,71,0.08)' : undefined }}>
              {noteSaved ? 'Note added' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
