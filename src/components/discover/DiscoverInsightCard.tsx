import { useState, useRef, useEffect } from 'react';
import type { DiscoverInsight } from '@/lib/discover';
import { useIdea } from '@/context/IdeaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ScoreDonut from './ScoreDonut';
import ScoreMethodology from './ScoreMethodology';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pain_point: { label: 'PAIN POINT', color: '#8C6B6B', bg: 'rgba(140,107,107,0.06)', icon: 'P' },
  workaround: { label: 'WORKAROUND', color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)', icon: 'W' },
  demand_signal: { label: 'DEMAND SIGNAL', color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)', icon: 'D' },
  expectation: { label: 'EXPECTATION', color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)', icon: 'E' },
  market_gap: { label: 'MARKET GAP', color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)', icon: 'G' },
  opportunity: { label: 'OPPORTUNITY', color: 'var(--accent-blue)', bg: 'rgba(122,143,160,0.06)', icon: 'O' },
  trend: { label: 'TREND', color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)', icon: 'T' },
};

const DEFAULT_TYPE_CONFIG = { label: 'INSIGHT', color: '#8C6B6B', bg: 'rgba(140,107,107,0.06)', icon: '•' };

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
}

const PLATFORM_META: Record<string, { label: string }> = {
  reddit: { label: 'Reddit' },
  google: { label: 'Google' },
  yelp: { label: 'Yelp' },
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
        </button>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider-light)' }}>
        <div className="rounded-full h-full" style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 600ms ease-out' }} />
      </div>
      {showTip && (
        <div
          className="absolute z-20 rounded-[8px] p-3 shadow-lg"
          style={{
            bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, width: 220,
            backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', pointerEvents: 'none',
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

interface NoteInputProps {
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

function NoteInput({ onSubmit, onCancel }: NoteInputProps) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="mt-4 rounded-[10px] p-3" style={{ backgroundColor: 'var(--surface-input)', border: '1px solid var(--divider-light)' }} onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note about this insight…"
        rows={2}
        className="w-full resize-none"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', outline: 'none', lineHeight: 1.5 }}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button
          onClick={() => { if (text.trim()) onSubmit(text.trim()); }}
          disabled={!text.trim()}
          className="rounded-[8px] px-3 py-1 disabled:opacity-40"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const { setSelectedInsight, setCurrentStep, idea } = useIdea();
  const { user } = useAuth();
  const config = getTypeConfig(insight.type);

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded, showMethodology, showNoteInput]);

  const platforms = [...new Set((insight.sources || []).map(s => s.platform))];

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to pin insights'); return; }
    if (saved) return;
    setSaving(true);
    try {
      await supabase.from('saved_insights').insert({
        user_id: user.id,
        title: insight.title,
        content: insight.description,
        section_type: 'discover',
        tags: insight.tags,
        source_data: JSON.parse(JSON.stringify({
          type: insight.type,
          composite_score: insight.composite_score,
          frequency_score: insight.frequency_score,
          severity_score: insight.severity_score,
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
      // Find or create the project
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
          content: `[Discover → ${insight.title}] ${note}`,
        } as any);
      }
      setNoteSaved(true);
      setShowNoteInput(false);
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const scoreColor = insight.composite_score >= 7 ? 'var(--accent-teal)' :
    insight.composite_score >= 4 ? 'var(--accent-amber)' : '#8C6B6B';

  return (
    <div
      className="rounded-[14px] transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface-card)',
        boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
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
                style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: '0.06em', backgroundColor: config.bg, color: config.color }}
              >
                {config.label}
              </span>
              {platforms.map(p => {
                const meta = PLATFORM_META[p] || { label: p };
                return (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", backgroundColor: 'var(--surface-input)', color: 'var(--text-muted)' }}>
                    {meta.label}
                    <span style={{ fontSize: 9 }}>({insight.sources.filter(s => s.platform === p).length})</span>
                  </span>
                );
              })}
            </div>

            {/* Title */}
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {insight.title}
            </p>

            {/* Description */}
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>
              {insight.description}
            </p>

            {/* Score bars */}
            <div className="flex gap-3 mt-4">
              <ScoreBar label="Frequency" value={insight.frequency_score} color={scoreColor}
                explanation="How often this topic appears across sources." />
              <ScoreBar label="Severity" value={insight.severity_score} color={scoreColor}
                explanation="Emotional intensity of language used." />
              <ScoreBar label="Pay Signal" value={insight.willingness_to_pay} color={scoreColor}
                explanation="Mentions of pricing, budget, willingness to switch." />
              <ScoreBar label="Market Size" value={insight.market_size_signal} color={scoreColor}
                explanation="Breadth of affected users across platforms." />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {insight.tags.map((tag, i) => (
                <span key={i} className="rounded-full px-2.5 py-0.5"
                  style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 300, backgroundColor: 'var(--surface-input)', color: 'var(--text-muted)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Expand hint */}
            <div className="mt-3">
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--accent-primary)' }}>
                {expanded ? 'Hide evidence' : `${insight.sources.length} sources — click to expand`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded evidence drawer */}
      <div style={{ height: expanded ? contentHeight : 0, overflow: 'hidden', transition: 'height 300ms ease-out' }}>
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
                fontSize: 10, fontFamily: "'Inter', sans-serif", fontWeight: 300,
                backgroundColor: showMethodology ? 'rgba(26,26,26,0.06)' : 'var(--surface-input)',
                color: showMethodology ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {showMethodology ? 'Hide methodology' : 'How we scored this'}
            </button>
          </div>

          {showMethodology && <ScoreMethodology insight={insight} />}

          {/* Source evidence */}
          <div className="flex flex-col gap-3">
            {insight.sources.map((source, i) => {
              const meta = PLATFORM_META[source.platform] || { label: source.platform };
              return (
                <div key={i} className="rounded-[10px] p-4" style={{ backgroundColor: 'var(--surface-input)' }}>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    "{source.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{meta.label}</span>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="transition-colors duration-150"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      {source.author}
                    </a>
                    {source.upvotes != null && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                        {source.upvotes} upvotes
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

          {/* Note input */}
          {showNoteInput && (
            <NoteInput
              onSubmit={handleAddNote}
              onCancel={() => setShowNoteInput(false)}
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedInsight(insight.title); setCurrentStep('analyze'); }}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{ fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Deep dive this opportunity
            </button>
            <button
              onClick={handlePin}
              disabled={saving || saved}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 300,
                backgroundColor: saved ? 'rgba(91,140,126,0.08)' : 'var(--surface-input)',
                color: saved ? 'var(--accent-teal)' : 'var(--text-secondary)',
                border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saved ? 'Pinned' : saving ? 'Pinning…' : 'Pin Insight'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNoteInput(!showNoteInput); }}
              className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 300,
                backgroundColor: noteSaved ? 'rgba(91,140,126,0.08)' : 'var(--surface-input)',
                color: noteSaved ? 'var(--accent-teal)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
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
