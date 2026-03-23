import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIdea } from '@/context/IdeaContext';
import { toast } from 'sonner';

interface SavedIdea {
  id: string;
  idea_text: string;
  current_step: string;
  created_at: string;
  updated_at: string;
}

interface ExperimentMetric {
  target: number;
  actual: number;
  unit: string;
  target_label: string;
}

interface Experiment {
  id: string;
  idea_id: string;
  method_name: string;
  status: string;
  metrics: Record<string, ExperimentMetric> | null;
  created_at: string;
  updated_at: string;
  idea_text?: string;
  notes: string | null;
}

const STATUS_FLOW = ['planned', 'running', 'completed'] as const;

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { setIdea, setCurrentStep } = useIdea();
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ideas' | 'findings' | 'experiments'>('ideas');

  const allFindings = ideas.flatMap(idea => {
    const analysis = (idea as any).analysis_data;
    if (!analysis?.selected_findings) return [];
    return ((analysis.selected_findings as { text?: string; section?: string }[]) || [])
      .filter(f => f && f.text && f.section)
      .map(f => ({ ...f, idea_text: idea.idea_text, idea_id: idea.id }));
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [ideasRes, expRes] = await Promise.all([
      supabase.from('saved_ideas').select('*').order('updated_at', { ascending: false }),
      supabase.from('experiments').select('*').order('created_at', { ascending: false }),
    ]);
    if (ideasRes.data) setIdeas(ideasRes.data as SavedIdea[]);
    if (expRes.data && ideasRes.data) {
      const ideasMap = Object.fromEntries((ideasRes.data as SavedIdea[]).map(i => [i.id, i.idea_text]));
      setExperiments((expRes.data as unknown as Experiment[]).map(e => ({ ...e, idea_text: ideasMap[e.idea_id] || 'Unknown idea' })));
    }
    setLoading(false);
  };

  const resumeIdea = (idea: SavedIdea) => {
    setIdea(idea.idea_text);
    setCurrentStep((idea.current_step || 'discover') as any);
    navigate('/research');
  };

  const deleteIdea = async (id: string) => {
    await supabase.from('saved_ideas').delete().eq('id', id);
    loadData();
  };

  const updateExperimentStatus = async (exp: Experiment) => {
    const currentIdx = STATUS_FLOW.indexOf(exp.status as any);
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];
    await supabase.from('experiments').update({ status: nextStatus }).eq('id', exp.id);
    toast.success(`Status updated to ${nextStatus}`);
    loadData();
  };

  const deleteExperiment = async (id: string) => {
    await supabase.from('experiments').delete().eq('id', id);
    loadData();
  };

  if (authLoading || !user) return null;

  const stepColors: Record<string, string> = {
    discover: '#3B82F6', analyze: '#D4880F', setup: '#2D8B75', validate: '#6C5CE7',
  };

  const statusStyles: Record<string, { color: string; bg: string }> = {
    planned: { color: 'var(--text-muted)', bg: 'var(--surface-input)' },
    running: { color: '#D4880F', bg: 'rgba(212,136,15,0.06)' },
    completed: { color: '#2D8B75', bg: 'rgba(45,139,117,0.06)' },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      <header className="flex items-center justify-between px-6" style={{ height: 64 }}>
        <span className="cursor-pointer" style={{ fontSize: 18 }} onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
        </span>
        <div className="flex items-center" style={{ gap: 16 }}>
          <span className="cursor-pointer transition-colors duration-200" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }} onClick={() => navigate('/')}>New idea</span>
          <span className="cursor-pointer" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: '#E05252' }} onClick={signOut}>Sign out</span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 120px' }}>
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 10 }}>DASHBOARD</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h1>
        <p className="font-caption" style={{ fontSize: 13, marginBottom: 40 }}>{user.email}</p>

        {/* Tabs */}
        <div className="flex" style={{ gap: 4, marginBottom: 32, borderBottom: '1px solid var(--divider-light)', paddingBottom: 0 }}>
          {(['ideas', 'findings', 'experiments'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 20px', fontFamily: "'Inter', sans-serif", fontSize: 13,
              fontWeight: activeTab === tab ? 400 : 300,
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
              backgroundColor: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize',
            }}>
              {tab === 'ideas' ? `Ideas (${ideas.length})` : tab === 'findings' ? `Findings (${allFindings.length})` : `Experiments (${experiments.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}><p className="font-caption">Loading...</p></div>
        ) : activeTab === 'ideas' ? (
          <IdeasTab ideas={ideas} stepColors={stepColors} onResume={resumeIdea} onDelete={deleteIdea} onNavigate={() => navigate('/')} />
        ) : activeTab === 'findings' ? (
          <FindingsTab findings={allFindings} />
        ) : (
          <ExperimentsTab experiments={experiments} statusStyles={statusStyles} onStatusChange={updateExperimentStatus} onDelete={deleteExperiment} />
        )}
      </div>
    </div>
  );
}

// ═══ IDEAS TAB ═══
function IdeasTab({ ideas, stepColors, onResume, onDelete, onNavigate }: {
  ideas: SavedIdea[]; stepColors: Record<string, string>;
  onResume: (idea: SavedIdea) => void; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  if (ideas.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>No saved ideas yet</p>
      <p className="font-caption" style={{ marginBottom: 24 }}>Research an idea and save it to see it here.</p>
      <button onClick={onNavigate} className="rounded-[12px] transition-all duration-200 active:scale-[0.97]"
        style={{ padding: '10px 24px', backgroundColor: 'var(--accent-primary)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, border: 'none', cursor: 'pointer' }}>
        Start researching
      </button>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {ideas.map(idea => (
        <div key={idea.id} className="rounded-[12px] p-5 transition-all duration-200 cursor-pointer"
          style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          onClick={() => onResume(idea)}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div className="flex items-start justify-between">
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>{idea.idea_text}</p>
              <div className="flex items-center" style={{ gap: 10 }}>
                <span className="rounded-full" style={{ padding: '2px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 400, color: stepColors[idea.current_step] || 'var(--text-muted)', backgroundColor: `${stepColors[idea.current_step] || '#999'}10` }}>
                  {idea.current_step}
                </span>
                <span className="font-caption" style={{ fontSize: 11 }}>{new Date(idea.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ FINDINGS TAB ═══
function FindingsTab({ findings }: { findings: { text?: string; section?: string; idea_text: string; idea_id: string }[] }) {
  const sectionColors: Record<string, string> = {
    opportunity: '#3B82F6', customers: '#2D8B75', competitors: '#D4880F',
    rootcause: '#6C5CE7', costs: '#E05252', risk: '#E05252',
    location: '#3B82F6', moat: '#2D8B75',
  };

  if (findings.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>No saved findings yet</p>
      <p className="font-caption">Save key findings from the Analyze tab to see them here.</p>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {findings.map((f, i) => {
        const color = sectionColors[f.section || ''] || 'var(--text-muted)';
        return (
          <div key={i} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 3, height: '100%', minHeight: 32, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 6 }}>{f.text}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color, backgroundColor: `${color}10`, textTransform: 'capitalize' }}>
                    {(f.section || '').replace('rootcause', 'Root Cause')}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)' }}>
                    {f.idea_text.slice(0, 50)}{f.idea_text.length > 50 ? '...' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ EXPERIMENTS TAB ═══
function ExperimentsTab({ experiments, statusStyles, onStatusChange, onDelete }: {
  experiments: Experiment[];
  statusStyles: Record<string, { color: string; bg: string }>;
  onStatusChange: (exp: Experiment) => void;
  onDelete: (id: string) => void;
}) {
  if (experiments.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>No experiments yet</p>
      <p className="font-caption">Save your validation toolkit to start tracking experiments here.</p>
    </div>
  );

  // Group by idea
  const grouped = experiments.reduce<Record<string, Experiment[]>>((acc, exp) => {
    const key = exp.idea_text || exp.idea_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {Object.entries(grouped).map(([ideaText, exps]) => (
        <div key={ideaText}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 10 }}>
            {ideaText.slice(0, 80)}{ideaText.length > 80 ? '...' : ''}
          </p>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {exps.map(exp => {
              const sc = statusStyles[exp.status] || statusStyles.planned;
              const metrics = exp.metrics as Record<string, ExperimentMetric> | null;
              const metricEntries = metrics ? Object.entries(metrics) : [];
              const metCount = metricEntries.length;
              const metMet = metricEntries.filter(([, v]) => v.target > 0 && v.actual >= v.target).length;

              return (
                <div key={exp.id} className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onStatusChange(exp)} className="rounded-full transition-all duration-200"
                        style={{ padding: '2px 12px', fontSize: 11, fontWeight: 400, fontFamily: "'Inter', sans-serif", color: sc.color, backgroundColor: sc.bg, border: 'none', cursor: 'pointer' }}
                        title="Click to advance status">
                        {exp.status}
                      </button>
                      <button onClick={() => onDelete(exp.id)}
                        style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Metric progress */}
                  {metricEntries.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                          {metMet}/{metCount} targets met
                        </span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: metMet === metCount && metCount > 0 ? '#2D8B75' : 'var(--text-muted)' }}>
                          {metCount > 0 ? Math.round((metMet / metCount) * 100) : 0}%
                        </span>
                      </div>
                      {/* Overall progress bar */}
                      <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                          height: '100%', borderRadius: 2, transition: 'width 300ms ease-out',
                          width: `${metCount > 0 ? (metMet / metCount) * 100 : 0}%`,
                          backgroundColor: metMet === metCount && metCount > 0 ? '#2D8B75' : metMet > 0 ? '#D4880F' : 'var(--divider-light)',
                        }} />
                      </div>
                      {/* Individual metrics */}
                      <div className="flex flex-wrap" style={{ gap: 6 }}>
                        {metricEntries.map(([key, val]) => {
                          const pct = val.target > 0 ? Math.min((val.actual / val.target) * 100, 100) : 0;
                          const met = pct >= 100;
                          return (
                            <span key={key} className="rounded-[6px]" style={{
                              padding: '3px 8px', fontSize: 11, fontFamily: "'Inter', sans-serif",
                              backgroundColor: met ? 'rgba(45,139,117,0.06)' : 'var(--surface-input)',
                              color: met ? '#2D8B75' : 'var(--text-secondary)',
                            }}>
                              {key}: {val.actual}/{val.target_label || val.target} {val.unit}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="font-caption" style={{ fontSize: 10, marginTop: 8 }}>
                    Created {new Date(exp.created_at).toLocaleDateString()}
                    {exp.updated_at !== exp.created_at && ` · Updated ${new Date(exp.updated_at).toLocaleDateString()}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
