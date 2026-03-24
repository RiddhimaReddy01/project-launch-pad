import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { decomposeIdea, type DecomposeResult, type DecomposeStage1, type DecomposeStage2 } from '@/lib/decompose';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store, MapPin, Tag, Users, Pencil, Check, RotateCcw, Save, ArrowRight } from 'lucide-react';

type Status = 'idle' | 'loading' | 'done' | 'error';

const CARD_CONFIG = {
  business_type: {
    icon: Store,
    color: 'var(--accent-primary)',
    bg: 'rgba(45,107,82,0.06)',
    border: 'rgba(45,107,82,0.18)',
  },
  location: {
    icon: MapPin,
    color: 'var(--accent-blue)',
    bg: 'rgba(61,95,143,0.06)',
    border: 'rgba(61,95,143,0.18)',
  },
  price_tier: {
    icon: Tag,
    color: 'var(--accent-amber)',
    bg: 'rgba(158,116,9,0.06)',
    border: 'rgba(158,116,9,0.18)',
  },
  target_customers: {
    icon: Users,
    color: 'var(--accent-purple)',
    bg: 'rgba(106,90,148,0.06)',
    border: 'rgba(106,90,148,0.18)',
  },
} as const;

interface VisualCardProps {
  configKey: keyof typeof CARD_CONFIG;
  label: string;
  value: string;
  onSave: (val: string) => void;
}

function VisualCard({ configKey, label, value, onSave }: VisualCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = CARD_CONFIG[configKey];
  const Icon = config.icon;

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      style={{
        backgroundColor: config.bg,
        border: `1.5px solid ${config.border}`,
        cursor: 'default',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, backgroundColor: config.color }}
          >
            <Icon size={16} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: config.color }}>
            {label}
          </span>
        </div>
        <button
          onClick={() => { if (editing) { onSave(draft); setEditing(false); } else setEditing(true); }}
          className="flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-150"
          style={{
            fontSize: 11, fontWeight: 400, fontFamily: "'Outfit', sans-serif",
            color: editing ? '#fff' : config.color,
            backgroundColor: editing ? config.color : 'transparent',
            border: 'none', cursor: 'pointer',
          }}
        >
          {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
        </button>
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } }}
          className="w-full rounded-lg px-3 py-2.5"
          style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', backgroundColor: 'var(--surface-card)', border: `1px solid ${config.border}`, outline: 'none' }}
        />
      ) : (
        <p style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {value || '\u2014'}
        </p>
      )}
    </div>
  );
}

interface VisualListCardProps {
  label: string;
  items: string[];
  onSave: (items: string[]) => void;
}

function VisualListCard({ label, items, onSave }: VisualListCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join('\n'));
  const config = CARD_CONFIG.target_customers;
  const Icon = config.icon;

  useEffect(() => { setDraft(items.join('\n')); }, [items]);

  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 col-span-1 md:col-span-2 hover:scale-[1.01] hover:shadow-lg"
      style={{
        backgroundColor: config.bg,
        border: `1.5px solid ${config.border}`,
        cursor: 'default',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, backgroundColor: config.color }}
          >
            <Icon size={16} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: config.color }}>
            {label}
          </span>
        </div>
        <button
          onClick={() => { if (editing) { onSave(draft.split('\n').map(s => s.trim()).filter(Boolean)); setEditing(false); } else setEditing(true); }}
          className="flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-150"
          style={{
            fontSize: 11, fontWeight: 400, fontFamily: "'Outfit', sans-serif",
            color: editing ? '#fff' : config.color,
            backgroundColor: editing ? config.color : 'transparent',
            border: 'none', cursor: 'pointer',
          }}
        >
          {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
        </button>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(3, items.length + 1)}
          className="w-full rounded-lg px-3 py-2.5 resize-none"
          style={{ fontSize: 14, fontWeight: 300, color: 'var(--text-primary)', backgroundColor: 'var(--surface-card)', border: `1px solid ${config.border}`, outline: 'none', lineHeight: 1.6 }}
          placeholder="One per line"
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="rounded-full px-3.5 py-1.5" style={{
              fontSize: 13, fontWeight: 400,
              backgroundColor: 'var(--surface-card)',
              color: config.color,
              border: `1px solid ${config.border}`,
            }}>{item}</span>
          ))}
          {items.length === 0 && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{'\u2014'}</span>}
        </div>
      )}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 stagger-children">
      {Object.entries(CARD_CONFIG).map(([key, config], i) => {
        const Icon = config.icon;
        return (
          <div
            key={key}
            className={`rounded-xl p-5 ${key === 'target_customers' ? 'md:col-span-2' : ''}`}
            style={{ backgroundColor: config.bg, border: `1.5px solid ${config.border}` }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: config.color, opacity: 0.5 }}>
                <Icon size={16} color="#fff" strokeWidth={2} />
              </div>
              <div className="animate-pulse rounded h-3 w-20" style={{ backgroundColor: `${config.color}20` }} />
            </div>
            <div className="animate-pulse rounded h-5 w-3/4" style={{ backgroundColor: `${config.color}15` }} />
          </div>
        );
      })}
    </div>
  );
}

export default function UnderstandModule() {
  const { idea, setIdea, decomposeResult, setDecomposeResult, setCurrentStep } = useIdea();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>(decomposeResult ? 'done' : 'idle');
  const [result, setResult] = useState<DecomposeResult | null>(decomposeResult);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [ideaDraft, setIdeaDraft] = useState(idea);
  const hasRun = useRef(!!decomposeResult);

  useEffect(() => {
    if (idea && !hasRun.current) {
      hasRun.current = true;
      runDecompose(idea);
    }
  }, [idea]);

  const runDecompose = async (text?: string) => {
    const target = text || ideaDraft;
    if (!target || target.trim().split(/\s+/).length < 3) {
      setError('Please enter at least 3 words to describe your idea (e.g. "juice bar in Austin").');
      setStatus('error');
      return;
    }
    if (target !== idea) setIdea(target);
    setError(null);
    setStatus('loading');
    try {
      const data = await decomposeIdea(target);
      setResult(data);
      setDecomposeResult(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  const updateStage1 = (field: keyof DecomposeStage1, value: any) => {
    if (!result) return;
    const updated = { ...result, stage1: { ...result.stage1, [field]: value } };
    setResult(updated);
    setDecomposeResult(updated);
  };

  const updateStage2 = (field: keyof DecomposeStage2, value: any) => {
    if (!result) return;
    const updated = { ...result, stage2: { ...result.stage2, [field]: value } };
    setResult(updated);
    setDecomposeResult(updated);
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaveStatus('saving');
    try {
      const { data: existing } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('idea_text', idea)
        .maybeSingle();

      const payload = {
        analysis_data: JSON.parse(JSON.stringify({ decompose: { stage1: result.stage1, stage2: result.stage2 } })),
        current_step: 'understand',
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('saved_ideas').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('saved_ideas').insert({
          user_id: user.id,
          idea_text: idea,
          title: result.stage1.business_type,
          ...payload,
        } as any);
      }
      setSaveStatus('saved');
      toast.success('Understanding saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      toast.error('Failed to save');
      setSaveStatus('idle');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="font-heading" style={{ fontSize: 24, marginBottom: 6 }}>
          Understand Your Idea
        </p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          These four parameters shape all downstream research. Edit them to refine your results.
        </p>
      </div>

      {/* Idea input area */}
      {status === 'idle' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1.5px solid var(--divider)' }}>
          <label style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Describe your business idea
          </label>
          <textarea
            value={ideaDraft}
            onChange={(e) => setIdeaDraft(e.target.value)}
            placeholder="e.g. A healthy meal prep delivery service in Austin, TX targeting busy professionals"
            rows={3}
            className="w-full mt-3 rounded-lg px-4 py-3 resize-none"
            style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: 'var(--text-primary)', backgroundColor: 'var(--surface-input)', border: '1.5px solid var(--divider)', outline: 'none' }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--divider)'}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={() => runDecompose()}
              disabled={!ideaDraft || ideaDraft.trim().split(/\s+/).length < 3}
              className="btn-primary disabled:opacity-40 active:scale-[0.97] flex items-center gap-2"
              style={{ fontSize: 14, padding: '10px 24px', borderRadius: 10 }}
            >
              Break down my idea
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <>
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="rounded-full" style={{ width: 18, height: 18, border: '2px solid var(--divider)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>Breaking down your idea...</span>
          </div>
          <ResultSkeleton />
        </>
      )}

      {status === 'error' && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'rgba(196,69,62,0.04)', border: '1.5px solid rgba(196,69,62,0.2)' }}>
          <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--error)', marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => { hasRun.current = false; runDecompose(); }}
            className="btn-primary active:scale-[0.97] flex items-center gap-2 mx-auto"
            style={{ fontSize: 14, padding: '10px 20px' }}
          >
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="space-y-6 animate-fade-in">
          {/* Actions bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {result.cached && (
              <span className="badge badge-green">Instant result</span>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={() => { hasRun.current = false; runDecompose(); }}
                className="btn-secondary flex items-center gap-1.5" style={{ fontSize: 12 }}>
                <RotateCcw size={12} />
                Re-analyze
              </button>
              {user && (
                <button onClick={handleSave} disabled={saveStatus === 'saving'}
                  className="btn-secondary flex items-center gap-1.5"
                  style={{
                    fontSize: 12,
                    color: saveStatus === 'saved' ? 'var(--accent-primary)' : undefined,
                    backgroundColor: saveStatus === 'saved' ? 'var(--accent-primary-light)' : undefined,
                    borderColor: saveStatus === 'saved' ? 'rgba(45,107,82,0.2)' : undefined,
                  }}>
                  <Save size={12} />
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* 4 visual parameter cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            <VisualCard
              configKey="business_type"
              label="Business Type"
              value={result.stage1.business_type}
              onSave={(v) => updateStage1('business_type', v)}
            />
            <VisualCard
              configKey="location"
              label="Location"
              value={[result.stage1.location.city, result.stage1.location.state].filter(Boolean).join(', ') || 'Not specified'}
              onSave={(v) => {
                const parts = v.split(',').map(s => s.trim());
                updateStage1('location', { city: parts[0] || '', state: parts[1] || '' });
              }}
            />
            <VisualCard
              configKey="price_tier"
              label="Price Tier"
              value={result.stage2.price_tier}
              onSave={(v) => updateStage2('price_tier', v)}
            />
            <VisualListCard
              label="Target Customers"
              items={result.stage2.target_customers}
              onSave={(v) => updateStage2('target_customers', v)}
            />
          </div>

          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
            Edit any field above — your changes will flow into Discover, Analyze, and all downstream research.
          </p>

          {/* Continue CTA */}
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setCurrentStep('discover')}
              className="btn-primary active:scale-[0.97] flex items-center gap-2"
              style={{ fontSize: 15, padding: '12px 32px', borderRadius: 12 }}
            >
              Continue to Discover
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
