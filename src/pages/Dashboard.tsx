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
  validation: 'Validation Tracker',
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

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

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
      setExperiments((expRes.data as unknown as Experiment[]).map(e => ({ ...e, idea_text: ideasMap[e.idea_id] || 'Unknown idea' })));
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

  const deleteIdea = async (id: string) => {
    await supabase.from('saved_ideas').delete().eq('id', id);
    toast.success('Project removed');
    loadData();
  };

  const deleteInsight = async (id: string) => {
    await supabase.from('saved_insights').delete().eq('id', id);
    toast.success('Insight removed');
    loadData();
  };

  const updateExperimentStatus = async (exp: Experiment) => {
    const currentIdx = STATUS_FLOW.indexOf(exp.status as any);
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];
    await supabase.from('experiments').update({ status: nextStatus }).eq('id', exp.id);
    toast.success(`Status → ${nextStatus}`);
    loadData();
  };

  const deleteExperiment = async (id: string) => {
    await supabase.from('experiments').delete().eq('id', id);
    toast.success('Experiment removed');
    loadData();
  };

  if (authLoading || !user) return null;

  const stepColors: Record<string, string> = {
    understand: 'var(--text-primary)',
    discover: 'var(--accent-blue)',
    analyze: 'var(--accent-amber)',
    setup: 'var(--accent-teal)',
    validate: 'var(--text-primary)',
  };

  const statusStyles: Record<string, { color: string; bg: string }> = {
    planned: { color: 'var(--text-muted)', bg: 'var(--surface-input)' },
    running: { color: 'var(--accent-amber)', bg: 'rgba(166,139,91,0.06)' },
    completed: { color: 'var(--accent-teal)', bg: 'rgba(91,140,126,0.06)' },
  };

  const filteredIdeas = ideas.filter(i =>
    !searchQuery || i.idea_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Overview stats
  const activeProjects = ideas.filter(i => i.current_step !== 'validate').length;
  const completedProjects = ideas.filter(i => i.current_step === 'validate').length;
  const totalExperiments = experiments.length;
  const runningExperiments = experiments.filter(e => e.status === 'running').length;

  // Most recent project
  const latestProject = ideas[0] || null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      <header className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: '1px solid var(--divider)' }}>
        <span className="cursor-pointer" style={{ fontSize: 18 }} onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
        </span>
        <div className="flex items-center" style={{ gap: 16 }}>
          <span className="cursor-pointer transition-colors duration-200" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }} onClick={() => navigate('/')}>New idea</span>
          <span className="cursor-pointer" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C6060' }} onClick={signOut}>Sign out</span>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 120px' }}>
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 10 }}>DASHBOARD</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h1>
        <p className="font-caption" style={{ fontSize: 13, marginBottom: 32 }}>{user.email}</p>

        {/* Tabs */}
        <div className="flex overflow-x-auto" style={{ gap: 0, marginBottom: 32, borderBottom: '1px solid var(--divider-light)', paddingBottom: 0 }}>
          {(Object.keys(TAB_LABELS) as DashboardTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 18px', fontFamily: "'Inter', sans-serif", fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: activeTab === tab ? 400 : 300,
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
          <div className="flex items-center justify-center" style={{ padding: 60 }}>
            <div className="rounded-full" style={{ width: 18, height: 18, border: '2px solid var(--divider-light)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={{ activeProjects, completedProjects, totalExperiments, runningExperiments, totalInsights: insights.length }}
                latestProject={latestProject}
                recentExperiments={experiments.slice(0, 3)}
                statusStyles={statusStyles}
                onResume={resumeIdea}
                onNewIdea={() => navigate('/')}
              />
            )}
            {activeTab === 'projects' && (
              <>
                <div className="mb-4">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects…"
                    className="w-full rounded-[10px] px-4 py-2.5"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider-light)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <ProjectsTab ideas={filteredIdeas} stepColors={stepColors} onResume={resumeIdea} onDelete={deleteIdea} onNavigate={() => navigate('/')} />
              </>
            )}
            {activeTab === 'insights' && (
              <InsightsTab insights={insights} onDelete={deleteInsight} />
            )}
            {activeTab === 'validation' && (
              <ValidationTab experiments={experiments} statusStyles={statusStyles} onStatusChange={updateExperimentStatus} onDelete={deleteExperiment} />
            )}
            {activeTab === 'account' && (
              <AccountTab user={user} onSignOut={signOut} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══ OVERVIEW TAB ═══
function OverviewTab({ stats, latestProject, recentExperiments, statusStyles, onResume, onNewIdea }: {
  stats: { activeProjects: number; completedProjects: number; totalExperiments: number; runningExperiments: number; totalInsights: number };
  latestProject: SavedIdea | null;
  recentExperiments: Experiment[];
  statusStyles: Record<string, { color: string; bg: string }>;
  onResume: (idea: SavedIdea) => void;
  onNewIdea: () => void;
}) {
  const statCards = [
    { label: 'Active Projects', value: stats.activeProjects },
    { label: 'Completed', value: stats.completedProjects },
    { label: 'Experiments', value: stats.totalExperiments },
    { label: 'Saved Insights', value: stats.totalInsights },
  ];

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 2 }}>{s.value}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resume CTA */}
      {latestProject ? (
        <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Pick up where you left off</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{latestProject.idea_text}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", color: 'var(--accent-teal)', backgroundColor: 'rgba(91,140,126,0.08)', textTransform: 'capitalize' }}>
              {latestProject.current_step}
            </span>
            <span style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)' }}>
              Updated {new Date(latestProject.updated_at).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={() => onResume(latestProject)}
            className="mt-4 rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Resume research →
          </button>
        </div>
      ) : (
        <div className="rounded-[14px] p-6 text-center" style={{ backgroundColor: 'var(--surface-card)' }}>
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Start your first project</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 16 }}>Enter a business idea and we'll help you research it end-to-end.</p>
          <button
            onClick={onNewIdea}
            className="rounded-[10px] px-5 py-2.5 transition-all duration-200 active:scale-[0.97]"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            New idea →
          </button>
        </div>
      )}

      {/* Recent experiments */}
      {recentExperiments.length > 0 && (
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Recent Experiments</p>
          <div className="flex flex-col gap-2">
            {recentExperiments.map(exp => {
              const sc = statusStyles[exp.status] || statusStyles.planned;
              return (
                <div key={exp.id} className="rounded-[10px] p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-card)' }}>
                  <div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{exp.method_name}</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>{(exp as any).idea_text?.slice(0, 50)}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", color: sc.color, backgroundColor: sc.bg, textTransform: 'capitalize' }}>{exp.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ PROJECTS TAB ═══
function ProjectsTab({ ideas, stepColors, onResume, onDelete, onNavigate }: {
  ideas: SavedIdea[]; stepColors: Record<string, string>;
  onResume: (idea: SavedIdea) => void; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  if (ideas.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>No projects yet</p>
      <p className="font-caption" style={{ marginBottom: 24 }}>Research an idea and save it to see it here.</p>
      <button onClick={onNavigate} className="rounded-[12px] transition-all duration-200 active:scale-[0.97]"
        style={{ padding: '10px 24px', backgroundColor: 'var(--accent-primary)', color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, border: 'none', cursor: 'pointer' }}>
        Start researching
      </button>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {ideas.map(idea => {
        const progress = idea.progress || 0;
        const stepLabel = idea.current_step || 'discover';
        return (
          <div key={idea.id} className="rounded-[12px] p-5 transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            onClick={() => onResume(idea)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div className="flex items-start justify-between">
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {idea.title || idea.idea_text}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {idea.idea_text.length > 100 ? idea.idea_text.slice(0, 100) + '…' : idea.idea_text}
                </p>
                <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                  <span className="rounded-full" style={{ padding: '2px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 400, color: stepColors[stepLabel] || 'var(--text-muted)', backgroundColor: `${stepColors[stepLabel] || '#999'}10`, textTransform: 'capitalize' }}>
                    {stepLabel}
                  </span>
                  {progress > 0 && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>{progress}% complete</span>
                  )}
                  <span className="font-caption" style={{ fontSize: 11 }}>{new Date(idea.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ INSIGHTS TAB ═══
function InsightsTab({ insights, onDelete }: { insights: SavedInsight[]; onDelete: (id: string) => void }) {
  if (insights.length === 0) return (
    <div className="text-center" style={{ padding: 60 }}>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>No saved insights yet</p>
      <p className="font-caption">Pin key findings from any project to collect them here.</p>
    </div>
  );

  const sectionColors: Record<string, string> = {
    opportunity: 'var(--accent-blue)', customers: 'var(--accent-teal)', competitors: 'var(--accent-amber)',
    rootcause: 'var(--accent-primary)', discover: 'var(--accent-blue)', general: 'var(--text-muted)',
  };

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {insights.map(insight => {
        const color = sectionColors[insight.section_type] || 'var(--text-muted)';
        return (
          <div key={insight.id} className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div style={{ width: 3, minHeight: 32, borderRadius: 2, backgroundColor: color, flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>{insight.title}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{insight.content}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color, backgroundColor: `${color}10`, textTransform: 'capitalize' }}>
                      {insight.section_type}
                    </span>
                    {insight.tags?.map(tag => (
                      <span key={tag} className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)', backgroundColor: 'var(--surface-input)' }}>
                        {tag}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)' }}>
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => onDelete(insight.id)}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}>
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ VALIDATION TAB ═══
function ValidationTab({ experiments, statusStyles, onStatusChange, onDelete }: {
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

  // Scorecard summary
  const totalMetrics = experiments.reduce((sum, exp) => {
    const m = exp.metrics as Record<string, ExperimentMetric> | null;
    return sum + (m ? Object.keys(m).length : 0);
  }, 0);
  const metMetrics = experiments.reduce((sum, exp) => {
    const m = exp.metrics as Record<string, ExperimentMetric> | null;
    if (!m) return sum;
    return sum + Object.values(m).filter(v => v.target > 0 && v.actual >= v.target).length;
  }, 0);
  const completedExp = experiments.filter(e => e.status === 'completed').length;
  const overallPct = totalMetrics > 0 ? Math.round((metMetrics / totalMetrics) * 100) : 0;

  // Verdict
  const verdict = overallPct >= 70 ? 'GO' : overallPct >= 40 ? 'PIVOT' : completedExp > 0 ? 'RECONSIDER' : 'IN PROGRESS';
  const verdictColor = verdict === 'GO' ? 'var(--accent-teal)' : verdict === 'PIVOT' ? 'var(--accent-amber)' : verdict === 'RECONSIDER' ? '#8C6060' : 'var(--text-muted)';

  // Group by idea
  const grouped = experiments.reduce<Record<string, Experiment[]>>((acc, exp) => {
    const key = (exp as any).idea_text || exp.idea_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Scorecard */}
      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validation Scorecard</p>
          <span className="rounded-full px-3 py-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: verdictColor, backgroundColor: `${verdictColor}10`, letterSpacing: '0.04em' }}>
            {verdict}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: 'var(--text-primary)' }}>{overallPct}%</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>Targets met</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: 'var(--text-primary)' }}>{completedExp}/{experiments.length}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>Experiments done</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: 'var(--text-primary)' }}>{metMetrics}/{totalMetrics}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>Metrics hit</p>
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${overallPct}%`, backgroundColor: verdictColor, transition: 'width 500ms ease-out' }} />
        </div>
      </div>

      {/* Grouped experiments */}
      {Object.entries(grouped).map(([ideaText, exps]) => (
        <div key={ideaText}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 10 }}>
            {ideaText.slice(0, 80)}{ideaText.length > 80 ? '…' : ''}
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
                        style={{ padding: '2px 12px', fontSize: 11, fontWeight: 400, fontFamily: "'Inter', sans-serif", color: sc.color, backgroundColor: sc.bg, border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}
                        title="Click to advance status">
                        {exp.status}
                      </button>
                      <button onClick={() => onDelete(exp.id)}
                        style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {metricEntries.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                          {metMet}/{metCount} targets met
                        </span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, color: metMet === metCount && metCount > 0 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                          {metCount > 0 ? Math.round((metMet / metCount) * 100) : 0}%
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--divider-light)', overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                          height: '100%', borderRadius: 2, transition: 'width 300ms ease-out',
                          width: `${metCount > 0 ? (metMet / metCount) * 100 : 0}%`,
                          backgroundColor: metMet === metCount && metCount > 0 ? 'var(--accent-teal)' : metMet > 0 ? 'var(--accent-amber)' : 'var(--divider-light)',
                        }} />
                      </div>
                      <div className="flex flex-wrap" style={{ gap: 6 }}>
                        {metricEntries.map(([key, val]) => {
                          const met = val.target > 0 && val.actual >= val.target;
                          return (
                            <span key={key} className="rounded-[6px]" style={{
                              padding: '3px 8px', fontSize: 11, fontFamily: "'Inter', sans-serif",
                              backgroundColor: met ? 'rgba(91,140,126,0.06)' : 'var(--surface-input)',
                              color: met ? 'var(--accent-teal)' : 'var(--text-secondary)',
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

// ═══ ACCOUNT TAB ═══
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
    if (error) toast.error('Failed to update');
    else toast.success('Name updated');
  };

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email || '');
    if (error) toast.error('Failed to send reset email');
    else toast.success('Password reset email sent');
  };

  return (
    <div className="space-y-8" style={{ maxWidth: 480 }}>
      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Profile</p>

        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>{user.email}</p>

        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Display Name</label>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 rounded-[8px] px-3 py-2"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, backgroundColor: 'var(--surface-input)', border: '1px solid var(--divider-light)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button
            onClick={handleSaveName}
            disabled={saving}
            className="rounded-[8px] px-4 py-2 transition-all duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Security</p>
        <button
          onClick={handlePasswordReset}
          className="rounded-[10px] px-4 py-2 transition-all duration-200"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, backgroundColor: 'var(--surface-input)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
        >
          Reset password via email
        </button>
      </div>

      <div className="rounded-[14px] p-6" style={{ backgroundColor: 'rgba(140,96,96,0.03)', border: '1px solid rgba(140,96,96,0.12)' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', color: '#8C6060', textTransform: 'uppercase', marginBottom: 12 }}>Danger Zone</p>
        <button
          onClick={onSignOut}
          className="rounded-[10px] px-4 py-2 transition-all duration-200"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400, backgroundColor: 'transparent', color: '#8C6060', border: '1px solid rgba(140,96,96,0.2)', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

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
