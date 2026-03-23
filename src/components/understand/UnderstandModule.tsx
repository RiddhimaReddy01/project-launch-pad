import { useState, useEffect, useRef } from 'react';
import { useIdea } from '@/context/IdeaContext';
import { decomposeIdea, type DecomposeResult, type DecomposeStage1, type DecomposeStage2 } from '@/lib/decompose';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface EditableCardProps {
  label: string;
  value: string;
  onSave: (val: string) => void;
  mono?: boolean;
}

function EditableCard({ label, value, onSave, mono }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  return (
    <div
      className="rounded-[12px] p-4 transition-all duration-200"
      style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <button
          onClick={() => {
            if (editing) { onSave(draft); setEditing(false); }
            else setEditing(true);
          }}
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } }}
          className="w-full rounded-[8px] px-3 py-2"
          style={{
            fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "'Inter', sans-serif",
            fontSize: 14, fontWeight: 400, color: 'var(--text-primary)',
            backgroundColor: 'var(--surface-input)', border: '1px solid var(--divider-light)', outline: 'none',
          }}
        />
      ) : (
        <p style={{
          fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "'Inter', sans-serif",
          fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5,
        }}>
          {value || '—'}
        </p>
      )}
    </div>
  );
}

interface EditableListCardProps {
  label: string;
  items: string[];
  onSave: (items: string[]) => void;
}

function EditableListCard({ label, items, onSave }: EditableListCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join('\n'));

  useEffect(() => { setDraft(items.join('\n')); }, [items]);

  return (
    <div
      className="rounded-[12px] p-4 transition-all duration-200"
      style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <button
          onClick={() => {
            if (editing) { onSave(draft.split('\n').map(s => s.trim()).filter(Boolean)); setEditing(false); }
            else setEditing(true);
          }}
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(3, items.length + 1)}
          className="w-full rounded-[8px] px-3 py-2 resize-none"
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300,
            color: 'var(--text-primary)', backgroundColor: 'var(--surface-input)',
            border: '1px solid var(--divider-light)', outline: 'none', lineHeight: 1.6,
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1"
              style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 300, backgroundColor: 'var(--surface-input)', color: 'var(--text-secondary)' }}
            >
              {item}
            </span>
          ))}
          {items.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
        </div>
      )}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)' }}>
          <div className="animate-pulse">
            <div className="rounded h-3 w-20 mb-3" style={{ backgroundColor: 'var(--divider-light)' }} />
            <div className="rounded h-5 w-3/4" style={{ backgroundColor: 'var(--divider-light)' }} />
          </div>
        </div>
      ))}
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
      setError('Please enter at least 3 words to describe your idea.');
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
      {/* Section header */}
      <div className="mb-6">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Understand Your Idea
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginTop: 4 }}>
          We break down your idea into structured research components
        </p>
      </div>

      {/* Idea input area */}
      {status === 'idle' && (
        <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
            Describe your business idea
          </label>
          <textarea
            value={ideaDraft}
            onChange={(e) => setIdeaDraft(e.target.value)}
            placeholder="e.g. A healthy meal prep delivery service in Austin, TX targeting busy professionals"
            rows={3}
            className="w-full mt-3 rounded-[10px] px-4 py-3 resize-none"
            style={{
              fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 300, lineHeight: 1.6,
              color: 'var(--text-primary)', backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--divider-light)', outline: 'none',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--divider-light)'}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={() => runDecompose()}
              disabled={!ideaDraft || ideaDraft.trim().split(/\s+/).length < 3}
              className="rounded-[10px] px-6 py-2.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400,
                backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Analyze idea →
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <>
          <div className="flex items-center justify-center gap-3 py-8">
            <div
              className="rounded-full"
              style={{ width: 18, height: 18, border: '2px solid var(--divider-light)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }}
            />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'var(--text-muted)' }}>
              Breaking down your idea…
            </span>
          </div>
          <ResultSkeleton />
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-[14px] p-6 text-center" style={{ backgroundColor: 'rgba(140,96,96,0.04)' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'var(--destructive)', marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => { hasRun.current = false; runDecompose(); }}
            className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Results — editable cards */}
      {status === 'done' && result && (
        <div className="space-y-6">
          {/* Sticky actions bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {result.cached && (
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", backgroundColor: 'rgba(91,140,126,0.08)', color: 'var(--accent-teal)' }}>
                Cached result
              </span>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => { hasRun.current = false; runDecompose(); }}
                className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
                style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 300, backgroundColor: 'var(--surface-input)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
              >
                Regenerate
              </button>
              {user && (
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className="rounded-[10px] px-4 py-2 transition-all duration-200 active:scale-[0.97]"
                  style={{
                    fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 400,
                    backgroundColor: saveStatus === 'saved' ? 'rgba(91,140,126,0.08)' : 'var(--surface-input)',
                    color: saveStatus === 'saved' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableCard
              label="Business Type"
              value={result.stage1.business_type}
              onSave={(v) => updateStage1('business_type', v)}
            />
            <EditableCard
              label="Location"
              value={[result.stage1.location.city, result.stage1.location.state].filter(Boolean).join(', ') || 'Not specified'}
              onSave={(v) => {
                const parts = v.split(',').map(s => s.trim());
                updateStage1('location', { city: parts[0] || '', state: parts[1] || '' });
              }}
            />
            <EditableCard
              label="Price Tier"
              value={result.stage2.price_tier}
              onSave={(v) => updateStage2('price_tier', v)}
            />
            <EditableListCard
              label="Target Customers"
              items={result.stage2.target_customers}
              onSave={(v) => updateStage2('target_customers', v)}
            />
            <EditableListCard
              label="Search Queries"
              items={result.stage2.search_queries}
              onSave={(v) => updateStage2('search_queries', v)}
            />
            <EditableListCard
              label="Source Domains"
              items={result.stage2.source_domains}
              onSave={(v) => updateStage2('source_domains', v)}
            />
          </div>

          {/* Continue CTA */}
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setCurrentStep('discover')}
              className="rounded-[12px] px-8 py-3 transition-all duration-200 active:scale-[0.97]"
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400,
                backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(26,26,26,0.12)',
              }}
            >
              Continue to Discover →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
