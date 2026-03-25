import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIdea } from '@/context/IdeaContext';
import { toast } from 'sonner';

interface SavedIdea {
  id: string;
  idea_text: string;
  title: string | null;
  current_step: string;
  progress: number | null;
  created_at: string;
  updated_at: string;
  analysis_data: any;
  discover_data: any;
  setup_data: any;
  validate_data: any;
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

interface SavedInsight {
  id: string;
  title: string;
  content: string;
  section_type: string;
  tags: string[] | null;
  project_id: string | null;
  created_at: string;
}

interface ValidationAsset {
  id: string;
  project_id: string;
  asset_type: string;
  asset_data: any;
  method_id: string | null;
  status: string | null;
  created_at: string;
}

type DashboardTab = 'overview' | 'projects' | 'insights' | 'validation' | 'account';

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: 'Overview',
  projects: 'My Projects',
  insights: 'Saved Insights',
  validation: 'Validation',
  account: 'Account',
};

const STATUS_FLOW = ['planned', 'running', 'completed'] as const;

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { setIdea, setCurrentStep } = useIdea();
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [insights, setInsights] = useState<SavedInsight[]>([]);
  const [assets, setAssets] = useState<ValidationAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [ideasRes, expRes, insightsRes, assetsRes] = await Promise.all([
      supabase.from('saved_ideas').select('*').order('updated_at', { ascending: false }),
      supabase.from('experiments').select('*').order('created_at', { ascending: false }),
      supabase.from('saved_insights').select('*').order('created_at', { ascending: false }),
      supabase.from('validation_assets').select('*').order('created_at', { ascending: false }),
    ]);
    if (ideasRes.data) setIdeas(ideasRes.data as unknown as SavedIdea[]);
    if (expRes.data && ideasRes.data) {
      const ideasMap = Object.fromEntries((ideasRes.data as unknown as SavedIdea[]).map(i => [i.id, i.idea_text]));
      setExperiments((expRes.data as unknown as Experiment[]).map(e => ({ ...e, idea_text: ideasMap[e.idea_id] || 'Unknown' })));
    }
    if (insightsRes.data) setInsights(insightsRes.data as unknown as SavedInsight[]);
    if (assetsRes.data) setAssets(assetsRes.data as unknown as ValidationAsset[]);
    setLoading(false);
  };

  const resumeIdea = (idea: SavedIdea) => {
    setIdea(idea.idea_text);
    setCurrentStep((idea.current_step || 'discover') as any);
    navigate('/research');
  };

  const deleteIdea = async (id: string) => { await supabase.from('saved_ideas').delete().eq('id', id); toast.success('Removed'); loadData(); };
  const deleteInsight = async (id: string) => { await supabase.from('saved_insights').delete().eq('id', id); toast.success('Removed'); loadData(); };
  const updateExperimentStatus = async (exp: Experiment) => {
    const nextStatus = STATUS_FLOW[(STATUS_FLOW.indexOf(exp.status as any) + 1) % STATUS_FLOW.length];
    await supabase.from('experiments').update({ status: nextStatus }).eq('id', exp.id);
    toast.success(`Status → ${nextStatus}`);
    loadData();
  };
  const deleteExperiment = async (id: string) => { await supabase.from('experiments').delete().eq('id', id); toast.success('Removed'); loadData(); };

  if (authLoading || !user) return null;

  const filteredIdeas = ideas.filter(i =>
    !searchQuery || i.idea_text.toLowerCase().includes(searchQuery.toLowerCase()) || (i.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProjects = ideas.filter(i => i.current_step !== 'validate').length;
  const completedProjects = ideas.filter(i => i.current_step === 'validate').length;
  const latestProject = ideas[0] || null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      {/* Header */}
      <header className="glass flex items-center justify-between px-6 sticky top-0 z-50" style={{ height: 60, borderBottom: '1px solid var(--divider)' }}>
        <span className="cursor-pointer flex items-center gap-1.5" onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>Launch</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: 17, color: 'var(--accent-primary)' }}>Lean</span>
        </span>
        <div className="flex items-center gap-5">
          <span className="cursor-pointer transition-colors duration-200" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onClick={() => navigate('/')}>+ New idea</span>
          <span className="cursor-pointer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)' }} onClick={signOut}>Sign out</span>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 120px' }}>
        <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>DASHBOARD</p>
        <h1 className="font-heading" style={{ fontSize: 32, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Welcome back</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 36 }}>{user.email}</p>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar" style={{ gap: 0, marginBottom: 36, borderBottom: '1px solid var(--divider-section)' }}>
          {(Object.keys(TAB_LABELS) as DashboardTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="whitespace-nowrap transition-all duration-200"
              style={{
                padding: '12px 20px', fontSize: 14,
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 80 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Loading your data…</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={{ activeProjects, completedProjects, totalExperiments: experiments.length, runningExperiments: experiments.filter(e => e.status === 'running').length, totalInsights: insights.length }}
                latestProject={latestProject}
                recentExperiments={experiments.slice(0, 3)}
                onResume={resumeIdea}
                onNewIdea={() => navigate('/')}
              />
            )}
            {activeTab === 'projects' && (
              <>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects…"
                  className="w-full rounded-xl px-4 py-3 mb-5"
                  style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,230,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <ProjectsTab ideas={filteredIdeas} onResume={resumeIdea} onDelete={deleteIdea} onNavigate={() => navigate('/')} />
              </>
            )}
            {activeTab === 'insights' && <InsightsTab insights={insights} onDelete={deleteInsight} />}
            {activeTab === 'validation' && <ValidationTab experiments={experiments} onStatusChange={updateExperimentStatus} onDelete={deleteExperiment} onUpdateMetric={async (expId, metricKey, actual) => {
              const exp = experiments.find(e => e.id === expId);
              if (!exp?.metrics) return;
              const updated = { ...exp.metrics, [metricKey]: { ...exp.metrics[metricKey], actual } };
              await supabase.from('experiments').update({ metrics: updated as any }).eq('id', expId);
              toast.success('Metric updated');
              loadData();
            }} />}
            {activeTab === 'account' && <AccountTab user={user} onSignOut={signOut} />}
          </>
        )}
      </div>
    </div>
  );
}

// ═══ OVERVIEW ═══
function OverviewTab({ stats, latestProject, recentExperiments, onResume, onNewIdea }: {
  stats: { activeProjects: number; completedProjects: number; totalExperiments: number; runningExperiments: number; totalInsights: number };
  latestProject: SavedIdea | null; recentExperiments: Experiment[];
  onResume: (idea: SavedIdea) => void; onNewIdea: () => void;
}) {
  const statCards = [
    { label: 'Active Projects', value: stats.activeProjects, color: 'var(--accent-primary)' },
    { label: 'Completed', value: stats.completedProjects, color: 'var(--accent-teal)' },
    { label: 'Experiments', value: stats.totalExperiments, color: 'var(--accent-amber)' },
    { label: 'Saved Insights', value: stats.totalInsights, color: 'var(--accent-blue)' },
  ];

  return (
    <div className="space-y-8 stagger-children">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
            <p className="font-heading" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{s.value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{s.label}</p>
            <div style={{ height: 3, width: 28, backgroundColor: s.color, borderRadius: 2, marginTop: 10, boxShadow: `0 0 8px ${s.color}40` }} />
          </div>
        ))}
      </div>

      {latestProject ? (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', borderLeft: '3px solid var(--accent-primary)' }}>
          <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>PICK UP WHERE YOU LEFT OFF</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{latestProject.idea_text}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="badge badge-green" style={{ textTransform: 'capitalize', fontWeight: 600 }}>{latestProject.current_step}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Updated {new Date(latestProject.updated_at).toLocaleDateString()}</span>
          </div>
          <button onClick={() => onResume(latestProject)} className="btn-primary mt-5 rounded-xl px-6 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>Resume research →</button>
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <p className="font-heading" style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Start your first project</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 20 }}>Enter a business idea and we'll help you research it end-to-end.</p>
          <button onClick={onNewIdea} className="btn-primary rounded-xl px-6 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>New idea →</button>
        </div>
      )}

      {recentExperiments.length > 0 && (
        <div>
          <p className="section-label mb-4" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>RECENT EXPERIMENTS</p>
          <div className="flex flex-col gap-3">
            {recentExperiments.map(exp => (
              <div key={exp.id} className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{(exp as any).idea_text?.slice(0, 50)}</p>
                </div>
                <span className={`badge ${exp.status === 'completed' ? 'badge-green' : exp.status === 'running' ? 'badge-amber' : 'badge-muted'}`} style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                  {exp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ PROJECTS ═══
function ProjectsTab({ ideas, onResume, onDelete, onNavigate }: {
  ideas: SavedIdea[]; onResume: (idea: SavedIdea) => void; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  if (ideas.length === 0) return (
    <div className="text-center" style={{ padding: 80 }}>
      <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>No projects yet</p>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 24 }}>Research an idea and save it to see it here.</p>
      <button onClick={onNavigate} className="btn-primary rounded-xl px-6 py-2.5" style={{ fontSize: 14, fontWeight: 600 }}>Start researching</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 stagger-children">
      {ideas.map(idea => {
        const stepLabel = idea.current_step || 'discover';
        const sections = idea.analysis_data?.sections ? Object.keys(idea.analysis_data.sections).length : 0;
        const hasDiscover = !!idea.discover_data;
        const hasSetup = !!idea.setup_data;
        const hasValidate = !!idea.validate_data;
        const progress = Math.round(((hasDiscover ? 1 : 0) + Math.min(sections, 5) + (hasSetup ? 1 : 0) + (hasValidate ? 1 : 0)) / 8 * 100);

        return (
          <div key={idea.id} className="rounded-xl p-5 cursor-pointer transition-all duration-200" onClick={() => onResume(idea)}
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--divider-section)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="flex items-start justify-between">
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {idea.title || idea.idea_text}
                </p>
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  <span className="badge badge-green" style={{ textTransform: 'capitalize', fontWeight: 600 }}>{stepLabel}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{new Date(idea.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider)' }}>
                    <div className="animate-progress" style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-teal))', borderRadius: 99, transition: 'width 500ms ease-out' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{progress}%</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 14, color: 'var(--text-muted)' }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ INSIGHTS ═══
function InsightsTab({ insights, onDelete }: { insights: SavedInsight[]; onDelete: (id: string) => void }) {
  if (insights.length === 0) return (
    <div className="text-center" style={{ padding: 80 }}>
      <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>No saved insights yet</p>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Pin key findings from any project to collect them here.</p>
    </div>
  );

  const sectionBadge: Record<string, string> = {
    opportunity: 'badge-blue', customers: 'badge-green', competitors: 'badge-amber',
    rootcause: 'badge-purple', discover: 'badge-blue', general: 'badge-muted',
  };

  return (
    <div className="flex flex-col gap-3 stagger-children">
      {insights.map(insight => (
        <div key={insight.id} className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div style={{ width: 3, minHeight: 36, borderRadius: 2, background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-purple))', flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{insight.title}</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{insight.content}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${sectionBadge[insight.section_type] || 'badge-muted'}`} style={{ textTransform: 'capitalize', fontWeight: 600 }}>{insight.section_type}</span>
                  {insight.tags?.map(tag => <span key={tag} className="badge badge-muted" style={{ fontWeight: 500 }}>{tag}</span>)}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{new Date(insight.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <button onClick={() => onDelete(insight.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 14, color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ VALIDATION TAB ═══
function ValidationTab({ experiments, onStatusChange, onDelete, onUpdateMetric }: {
  experiments: Experiment[];
  onStatusChange: (exp: Experiment) => void;
  onDelete: (id: string) => void;
  onUpdateMetric: (expId: string, metricKey: string, actual: number) => void;
}) {
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [editingMetric, setEditingMetric] = useState<{ expId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  if (experiments.length === 0) return (
    <div className="text-center" style={{ padding: 80 }}>
      <p className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>No experiments yet</p>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Run a validation toolkit on any idea to start tracking experiments.</p>
    </div>
  );

  const allMetrics = experiments.flatMap(exp => {
    const m = exp.metrics as Record<string, ExperimentMetric> | null;
    return m ? Object.entries(m).map(([k, v]) => ({ key: k, ...v, expId: exp.id })) : [];
  });
  const totalMetrics = allMetrics.length;
  const metMetrics = allMetrics.filter(m => m.target > 0 && m.actual >= m.target).length;
  const completedExp = experiments.filter(e => e.status === 'completed').length;
  const runningExp = experiments.filter(e => e.status === 'running').length;
  const overallPct = totalMetrics > 0 ? Math.round((metMetrics / totalMetrics) * 100) : 0;

  const verdict = overallPct >= 70 ? 'GO' : overallPct >= 40 ? 'PIVOT' : completedExp > 0 ? 'RECONSIDER' : 'IN PROGRESS';
  const verdictColor = verdict === 'GO' ? 'var(--accent-primary)' : verdict === 'PIVOT' ? 'var(--accent-amber)' : verdict === 'RECONSIDER' ? 'var(--error)' : 'var(--text-muted)';
  const verdictBadge = verdict === 'GO' ? 'badge-green' : verdict === 'PIVOT' ? 'badge-amber' : verdict === 'RECONSIDER' ? 'badge-purple' : 'badge-muted';

  const grouped = experiments.reduce<Record<string, Experiment[]>>((acc, exp) => {
    const key = (exp as any).idea_text || exp.idea_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  const handleStartEdit = (expId: string, key: string, current: number) => {
    setEditingMetric({ expId, key });
    setEditValue(String(current));
  };

  const handleSaveEdit = () => {
    if (editingMetric) {
      onUpdateMetric(editingMetric.expId, editingMetric.key, Number(editValue) || 0);
      setEditingMetric(null);
    }
  };

  return (
    <div className="space-y-8 stagger-children">
      {/* Verdict Engine — Hero Card */}
      <div className="rounded-xl p-7" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)', borderLeft: `4px solid ${verdictColor}` }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="section-label mb-2" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>VERDICT ENGINE</p>
            <p className="font-heading" style={{ fontSize: 24, fontWeight: 700 }}>Validation Progress</p>
          </div>
          <span className={`badge ${verdictBadge}`} style={{ fontSize: 14, padding: '5px 16px', fontWeight: 700, letterSpacing: '0.06em' }}>
            {verdict}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Overall', value: `${overallPct}%`, sub: 'targets met' },
            { label: 'Completed', value: `${completedExp}/${experiments.length}`, sub: 'experiments' },
            { label: 'Running', value: String(runningExp), sub: 'active now' },
            { label: 'Metrics Hit', value: `${metMetrics}/${totalMetrics}`, sub: 'tracked' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-heading" style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'var(--divider)' }}>
          <div className="animate-progress" style={{ height: '100%', borderRadius: 99, width: `${overallPct}%`, backgroundColor: verdictColor, boxShadow: `0 0 10px ${verdictColor}40`, transition: 'width 800ms ease-out' }} />
        </div>

        <div className="flex items-center gap-5 mt-4">
          {[
            { label: 'Planned', count: experiments.filter(e => e.status === 'planned').length, badge: 'badge-muted' },
            { label: 'Running', count: runningExp, badge: 'badge-amber' },
            { label: 'Completed', count: completedExp, badge: 'badge-green' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`badge ${s.badge}`} style={{ fontWeight: 600 }}>{s.count}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Experiments grouped by idea */}
      {Object.entries(grouped).map(([ideaText, exps]) => (
        <div key={ideaText}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            📋 {ideaText.slice(0, 80)}{ideaText.length > 80 ? '…' : ''}
          </p>
          <div className="flex flex-col gap-3">
            {exps.map(exp => {
              const metrics = exp.metrics as Record<string, ExperimentMetric> | null;
              const metricEntries = metrics ? Object.entries(metrics) : [];
              const metCount = metricEntries.length;
              const metMet = metricEntries.filter(([, v]) => v.target > 0 && v.actual >= v.target).length;
              const isExpanded = expandedExp === exp.id;
              const pct = metCount > 0 ? Math.round((metMet / metCount) * 100) : 0;

              return (
                <div key={exp.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedExp(isExpanded ? null : exp.id)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                        <span className={`badge ${exp.status === 'completed' ? 'badge-green' : exp.status === 'running' ? 'badge-amber' : 'badge-muted'}`} style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {exp.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(exp); }}
                          className="btn-secondary rounded-lg" style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px' }} title="Advance status">
                          ↻ Next
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(exp.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: '4px 8px' }}>✕</button>
                      </div>
                    </div>

                    {metCount > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--divider)' }}>
                          <div className="animate-progress" style={{
                            height: '100%', borderRadius: 99, width: `${pct}%`,
                            backgroundColor: pct >= 100 ? 'var(--accent-primary)' : pct > 0 ? 'var(--accent-amber)' : 'var(--divider)',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 32 }}>{metMet}/{metCount}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && metricEntries.length > 0 && (
                    <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--divider)' }}>
                      <p className="section-label mt-4 mb-4" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>METRICS</p>
                      <div className="flex flex-col gap-3">
                        {metricEntries.map(([key, val]) => {
                          const met = val.target > 0 && val.actual >= val.target;
                          const isEditing = editingMetric?.expId === exp.id && editingMetric?.key === key;
                          const pctVal = val.target > 0 ? Math.min(Math.round((val.actual / val.target) * 100), 100) : 0;

                          return (
                            <div key={key} className="rounded-lg p-4" style={{ backgroundColor: met ? 'rgba(0,212,230,0.06)' : 'var(--surface-elevated)' }}>
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{key}</span>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                        className="rounded-lg px-3 py-1" style={{ width: 70, fontSize: 13, fontWeight: 600, border: '1px solid var(--accent-primary)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingMetric(null); }}
                                        autoFocus />
                                      <button onClick={handleSaveEdit} className="btn-primary rounded-lg" style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px' }}>✓</button>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); handleStartEdit(exp.id, key, val.actual); }}
                                      className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, color: met ? 'var(--accent-primary)' : 'var(--accent-amber)', background: 'none', border: 'none', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                      {val.actual} / {val.target_label || val.target} {val.unit}
                                    </button>
                                  )}
                                  {met && <span style={{ fontSize: 13, color: 'var(--accent-primary)' }}>✓</span>}
                                </div>
                              </div>
                              <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: met ? 'rgba(0,212,230,0.15)' : 'var(--divider)' }}>
                                <div className="animate-progress" style={{ height: '100%', borderRadius: 99, width: `${pctVal}%`, backgroundColor: met ? 'var(--accent-primary)' : 'var(--accent-amber)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 12 }}>
                        Created {new Date(exp.created_at).toLocaleDateString()}
                        {exp.updated_at !== exp.created_at && ` · Updated ${new Date(exp.updated_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ ACCOUNT ═══
function AccountTab({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [user.id]);

  const handleSaveName = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName } as any).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error('Failed to update'); else toast.success('Name updated');
  };

  return (
    <div className="space-y-6 stagger-children" style={{ maxWidth: 500 }}>
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <p className="section-label mb-5" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>PROFILE</p>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>{user.email}</p>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Display Name</label>
        <div className="flex gap-3">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 rounded-xl px-4 py-2.5"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--divider)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider)'; }}
          />
          <button onClick={handleSaveName} disabled={saving} className="btn-primary rounded-xl px-5" style={{ fontSize: 13, fontWeight: 600 }}>{saving ? '...' : 'Save'}</button>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider)' }}>
        <p className="section-label mb-5" style={{ fontWeight: 700, letterSpacing: '0.14em' }}>SECURITY</p>
        <button onClick={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email || '');
          if (error) toast.error('Failed'); else toast.success('Reset email sent');
        }} className="btn-secondary rounded-xl px-5 py-2.5" style={{ fontSize: 13, fontWeight: 600 }}>Reset password via email</button>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <p className="section-label mb-4" style={{ color: 'var(--error)', fontWeight: 700, letterSpacing: '0.14em' }}>DANGER ZONE</p>
        <button onClick={onSignOut} className="btn-secondary rounded-xl px-5 py-2.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)', borderColor: 'rgba(239,68,68,0.25)' }}>Sign out</button>
      </div>
    </div>
  );
}
