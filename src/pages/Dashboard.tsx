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

const TAB_LABELS: Record<DashboardTab, { label: string; icon: string }> = {
  overview: { label: 'Overview', icon: '' },
  projects: { label: 'My Projects', icon: '' },
  insights: { label: 'Saved Insights', icon: '' },
  validation: { label: 'Validation', icon: '' },
  account: { label: 'Account', icon: '' },
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

  const stepColors: Record<string, string> = {
    discover: 'var(--accent-blue)',
    analyze: 'var(--accent-amber)', setup: 'var(--accent-primary)', validate: 'var(--accent-primary)',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      <header className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: '1px solid var(--divider)' }}>
        <span className="cursor-pointer" style={{ fontSize: 18 }} onClick={() => navigate('/')}>
          <span className="font-body" style={{ fontWeight: 600 }}>Launch</span>
          <span className="font-heading" style={{ fontSize: 18, fontStyle: 'italic' }}>{'\u200B'}Lens</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="cursor-pointer font-caption transition-colors duration-200 hover:text-[var(--text-primary)]" onClick={() => navigate('/')}>+ New idea</span>
          <span className="cursor-pointer font-caption" style={{ color: 'var(--error)' }} onClick={signOut}>Sign out</span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 120px' }}>
        <p className="font-section-label mb-2">DASHBOARD</p>
        <h1 className="font-heading" style={{ fontSize: 28, marginBottom: 6 }}>Welcome back</h1>
        <p className="font-caption" style={{ marginBottom: 32 }}>{user.email}</p>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar" style={{ gap: 0, marginBottom: 32, borderBottom: '1px solid var(--divider)' }}>
          {(Object.keys(TAB_LABELS) as DashboardTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="font-body whitespace-nowrap transition-all duration-200"
              style={{
                padding: '10px 18px', fontSize: 13,
                fontWeight: activeTab === tab ? 400 : 300,
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}>
              {TAB_LABELS[tab].icon} {TAB_LABELS[tab].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}>
            <p className="font-caption">Loading your data…</p>
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
                  className="w-full card-base px-4 py-2.5 font-body mb-4" style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-primary)', outline: 'none' }} />
                <ProjectsTab ideas={filteredIdeas} stepColors={stepColors} onResume={resumeIdea} onDelete={deleteIdea} onNavigate={() => navigate('/')} />
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
    { label: 'Completed', value: stats.completedProjects, color: 'var(--accent-primary)' },
    { label: 'Experiments', value: stats.totalExperiments, color: 'var(--accent-amber)' },
    { label: 'Saved Insights', value: stats.totalInsights, color: 'var(--accent-blue)' },
  ];

  return (
    <div className="space-y-6 stagger-children">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="card-base p-4">
            <p className="font-heading" style={{ fontSize: 28, marginBottom: 2 }}>{s.value}</p>
            <p className="font-caption" style={{ fontSize: 11 }}>{s.label}</p>
            <div style={{ height: 2, width: 24, backgroundColor: s.color, borderRadius: 1, marginTop: 8, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {latestProject ? (
        <div className="card-base p-6">
          <p className="font-section-label mb-2">PICK UP WHERE YOU LEFT OFF</p>
          <p className="font-body" style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{latestProject.idea_text}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{latestProject.current_step}</span>
            <span className="font-caption" style={{ fontSize: 11 }}>Updated {new Date(latestProject.updated_at).toLocaleDateString()}</span>
          </div>
          <button onClick={() => onResume(latestProject)} className="btn-primary mt-4">Resume research →</button>
        </div>
      ) : (
        <div className="card-base p-6 text-center">
          <p className="font-heading" style={{ fontSize: 20, marginBottom: 8 }}>Start your first project</p>
          <p className="font-caption mb-4">Enter a business idea and we'll help you research it end-to-end.</p>
          <button onClick={onNewIdea} className="btn-primary">New idea →</button>
        </div>
      )}

      {recentExperiments.length > 0 && (
        <div>
          <p className="font-section-label mb-3">RECENT EXPERIMENTS</p>
          <div className="flex flex-col gap-2">
            {recentExperiments.map(exp => (
              <div key={exp.id} className="card-base p-4 flex items-center justify-between">
                <div>
                  <p className="font-body" style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                  <p className="font-caption" style={{ fontSize: 11 }}>{(exp as any).idea_text?.slice(0, 50)}</p>
                </div>
                <span className={`badge ${exp.status === 'completed' ? 'badge-green' : exp.status === 'running' ? 'badge-amber' : 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
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
function ProjectsTab({ ideas, stepColors, onResume, onDelete, onNavigate }: {
  ideas: SavedIdea[]; stepColors: Record<string, string>; onResume: (idea: SavedIdea) => void; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  if (ideas.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>No projects yet</p>
      <p className="font-caption mb-6">Research an idea and save it to see it here.</p>
      <button onClick={onNavigate} className="btn-primary">Start researching</button>
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
          <div key={idea.id} className="card-base card-interactive p-5" onClick={() => onResume(idea)}>
            <div className="flex items-start justify-between">
              <div style={{ flex: 1 }}>
                <p className="font-body" style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {idea.title || idea.idea_text}
                </p>
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{stepLabel}</span>
                  <span className="font-caption" style={{ fontSize: 11 }}>{new Date(idea.updated_at).toLocaleDateString()}</span>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--divider-light)' }}>
                    <div className="animate-progress" style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent-primary)', borderRadius: 99, transition: 'width 500ms ease-out' }} />
                  </div>
                  <span className="font-caption" style={{ fontSize: 10 }}>{progress}%</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
                className="font-caption" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
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
    <div className="text-center" style={{ padding: 60 }}>
      <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>No saved insights yet</p>
      <p className="font-caption">Pin key findings from any project to collect them here.</p>
    </div>
  );

  const sectionBadge: Record<string, string> = {
    opportunity: 'badge-blue', customers: 'badge-green', competitors: 'badge-amber',
    rootcause: 'badge-purple', discover: 'badge-blue', general: 'badge-muted',
  };

  return (
    <div className="flex flex-col gap-2 stagger-children">
      {insights.map(insight => (
        <div key={insight.id} className="card-base p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div style={{ width: 3, minHeight: 32, borderRadius: 2, backgroundColor: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 min-w-0">
                <p className="font-body" style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{insight.title}</p>
                <p className="font-body" style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{insight.content}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${sectionBadge[insight.section_type] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{insight.section_type}</span>
                  {insight.tags?.map(tag => <span key={tag} className="badge badge-muted">{tag}</span>)}
                  <span className="font-caption" style={{ fontSize: 10 }}>{new Date(insight.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <button onClick={() => onDelete(insight.id)} className="font-caption" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ VALIDATION TAB — FULL REBUILD ═══
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
    <div className="text-center" style={{ padding: 60 }}>
      <p className="font-heading" style={{ fontSize: 22, marginBottom: 8 }}>No experiments yet</p>
      <p className="font-caption mb-4">Run a validation toolkit on any idea to start tracking experiments.</p>
    </div>
  );

  // Aggregate scorecard
  const allMetrics = experiments.flatMap(exp => {
    const m = exp.metrics as Record<string, ExperimentMetric> | null;
    return m ? Object.entries(m).map(([k, v]) => ({ key: k, ...v, expId: exp.id })) : [];
  });
  const totalMetrics = allMetrics.length;
  const metMetrics = allMetrics.filter(m => m.target > 0 && m.actual >= m.target).length;
  const completedExp = experiments.filter(e => e.status === 'completed').length;
  const runningExp = experiments.filter(e => e.status === 'running').length;
  const overallPct = totalMetrics > 0 ? Math.round((metMetrics / totalMetrics) * 100) : 0;

  // Verdict
  const verdict = overallPct >= 70 ? 'GO' : overallPct >= 40 ? 'PIVOT' : completedExp > 0 ? 'RECONSIDER' : 'IN PROGRESS';
  const verdictColor = verdict === 'GO' ? 'var(--accent-primary)' : verdict === 'PIVOT' ? 'var(--accent-amber)' : verdict === 'RECONSIDER' ? 'var(--error)' : 'var(--text-muted)';
  const verdictBadge = verdict === 'GO' ? 'badge-green' : verdict === 'PIVOT' ? 'badge-amber' : verdict === 'RECONSIDER' ? 'badge-purple' : 'badge-muted';

  // Group by idea
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
    <div className="space-y-6 stagger-children">
      {/* Verdict Engine — Hero Card */}
      <div className="card-base p-6" style={{ borderColor: verdictColor, borderWidth: '1px 1px 1px 4px' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-section-label mb-1">VERDICT ENGINE</p>
            <p className="font-heading" style={{ fontSize: 22 }}>Validation Progress</p>
          </div>
          <span className={`badge ${verdictBadge}`} style={{ fontSize: 13, padding: '4px 14px', fontWeight: 500, letterSpacing: '0.04em' }}>
            {verdict}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Overall', value: `${overallPct}%`, sub: 'targets met' },
            { label: 'Completed', value: `${completedExp}/${experiments.length}`, sub: 'experiments' },
            { label: 'Running', value: String(runningExp), sub: 'active now' },
            { label: 'Metrics Hit', value: `${metMetrics}/${totalMetrics}`, sub: 'tracked' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-heading" style={{ fontSize: 24 }}>{s.value}</p>
              <p className="font-caption" style={{ fontSize: 10 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'var(--divider-light)' }}>
          <div className="animate-progress" style={{ height: '100%', borderRadius: 99, width: `${overallPct}%`, backgroundColor: verdictColor, transition: 'width 800ms ease-out' }} />
        </div>

        {/* Per-status breakdown */}
        <div className="flex items-center gap-4 mt-3">
          {[
            { label: 'Planned', count: experiments.filter(e => e.status === 'planned').length, badge: 'badge-muted' },
            { label: 'Running', count: runningExp, badge: 'badge-amber' },
            { label: 'Completed', count: completedExp, badge: 'badge-green' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`badge ${s.badge}`}>{s.count}</span>
              <span className="font-caption" style={{ fontSize: 11 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Experiments grouped by idea */}
      {Object.entries(grouped).map(([ideaText, exps]) => (
        <div key={ideaText}>
          <p className="font-body" style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 8 }}>
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
                <div key={exp.id} className="card-base overflow-hidden">
                  {/* Header — always visible */}
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedExp(isExpanded ? null : exp.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <p className="font-body" style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                        <span className={`badge ${exp.status === 'completed' ? 'badge-green' : exp.status === 'running' ? 'badge-amber' : 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
                          {exp.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(exp); }}
                          className="btn-secondary" style={{ fontSize: 10, padding: '2px 8px' }} title="Advance status">
                          ↻ Next
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(exp.id); }}
                          className="font-caption" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>

                    {/* Mini progress */}
                    {metCount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--divider-light)' }}>
                          <div className="animate-progress" style={{
                            height: '100%', borderRadius: 99, width: `${pct}%`,
                            backgroundColor: pct >= 100 ? 'var(--accent-primary)' : pct > 0 ? 'var(--accent-amber)' : 'var(--divider-light)',
                          }} />
                        </div>
                        <span className="font-caption" style={{ fontSize: 10, minWidth: 30 }}>{metMet}/{metCount}</span>
                        <span className="font-caption" style={{ fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded metrics — editable */}
                  {isExpanded && metricEntries.length > 0 && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--divider)' }}>
                      <p className="font-section-label mt-3 mb-3">METRICS</p>
                      <div className="flex flex-col gap-2">
                        {metricEntries.map(([key, val]) => {
                          const met = val.target > 0 && val.actual >= val.target;
                          const isEditing = editingMetric?.expId === exp.id && editingMetric?.key === key;
                          const pctVal = val.target > 0 ? Math.min(Math.round((val.actual / val.target) * 100), 100) : 0;

                          return (
                            <div key={key} className="rounded-md p-3" style={{ backgroundColor: met ? 'var(--accent-primary-light)' : 'var(--surface-input)' }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-body" style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-primary)' }}>{key}</span>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                        className="rounded-sm px-2 py-0.5 font-body" style={{ width: 60, fontSize: 12, border: '1px solid var(--accent-primary)', outline: 'none' }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingMetric(null); }}
                                        autoFocus />
                                      <button onClick={handleSaveEdit} className="btn-primary" style={{ fontSize: 10, padding: '2px 6px' }}>✓</button>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); handleStartEdit(exp.id, key, val.actual); }}
                                      className="font-body cursor-pointer" style={{ fontSize: 12, fontWeight: 400, color: met ? 'var(--accent-primary)' : 'var(--accent-amber)', background: 'none', border: 'none', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                      {val.actual} / {val.target_label || val.target} {val.unit}
                                    </button>
                                  )}
                                  {met && <span style={{ fontSize: 12 }}>✓</span>}
                                </div>
                              </div>
                              <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: met ? 'rgba(45,107,82,0.2)' : 'var(--divider-light)' }}>
                                <div className="animate-progress" style={{ height: '100%', borderRadius: 99, width: `${pctVal}%`, backgroundColor: met ? 'var(--accent-primary)' : 'var(--accent-amber)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="font-caption mt-3" style={{ fontSize: 10 }}>
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
    <div className="space-y-6 stagger-children" style={{ maxWidth: 480 }}>
      <div className="card-base p-6">
        <p className="font-section-label mb-4">PROFILE</p>
        <label className="font-caption block mb-1" style={{ fontSize: 12 }}>Email</label>
        <p className="font-body mb-4" style={{ fontSize: 14 }}>{user.email}</p>
        <label className="font-caption block mb-1" style={{ fontSize: 12 }}>Display Name</label>
        <div className="flex gap-2">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 card-base px-3 py-2 font-body" style={{ fontSize: 14, color: 'var(--text-primary)', outline: 'none' }} />
          <button onClick={handleSaveName} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="card-base p-6">
        <p className="font-section-label mb-4">SECURITY</p>
        <button onClick={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email || '');
          if (error) toast.error('Failed'); else toast.success('Reset email sent');
        }} className="btn-secondary">Reset password via email</button>
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: 'rgba(196,69,62,0.03)', border: '1px solid rgba(196,69,62,0.12)' }}>
        <p className="font-section-label mb-3" style={{ color: 'var(--error)' }}>DANGER ZONE</p>
        <button onClick={onSignOut} className="btn-secondary" style={{ color: 'var(--error)', borderColor: 'rgba(196,69,62,0.2)' }}>Sign out</button>
      </div>
    </div>
  );
}
