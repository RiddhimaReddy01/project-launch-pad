import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIdea } from '@/context/IdeaContext';

interface SavedIdea {
  id: string;
  idea_text: string;
  current_step: string;
  created_at: string;
  updated_at: string;
}

interface Experiment {
  id: string;
  idea_id: string;
  method_name: string;
  status: string;
  metrics: any;
  created_at: string;
  idea_text?: string;
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { setIdea, setCurrentStep } = useIdea();
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ideas' | 'findings' | 'experiments'>('ideas');

  // Extract findings from saved ideas
  const allFindings = ideas.flatMap(idea => {
    const analysis = (idea as any).analysis_data;
    if (!analysis?.selected_findings) return [];
    return (analysis.selected_findings as { text: string; section: string }[]).map(f => ({
      ...f,
      idea_text: idea.idea_text,
      idea_id: idea.id,
    }));
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
      setExperiments((expRes.data as Experiment[]).map(e => ({ ...e, idea_text: ideasMap[e.idea_id] || 'Unknown idea' })));
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

  if (authLoading || !user) return null;

  const stepColors: Record<string, string> = {
    discover: '#3B82F6',
    analyze: '#D4880F',
    setup: '#2D8B75',
    validate: '#6C5CE7',
  };

  const statusColors: Record<string, { color: string; bg: string }> = {
    planned: { color: 'var(--text-muted)', bg: 'var(--surface-input)' },
    running: { color: '#D4880F', bg: 'rgba(212,136,15,0.06)' },
    completed: { color: '#2D8B75', bg: 'rgba(45,139,117,0.06)' },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6" style={{ height: 64 }}>
        <span className="cursor-pointer" style={{ fontSize: 18 }} onClick={() => navigate('/')}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Launch</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{'\u200B'}Lens</span>
        </span>
        <div className="flex items-center" style={{ gap: 16 }}>
          <span
            className="cursor-pointer transition-colors duration-200"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}
            onClick={() => navigate('/')}
          >
            New idea
          </span>
          <span
            className="cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: '#E05252' }}
            onClick={signOut}
          >
            Sign out
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 120px' }}>
        <p className="font-caption" style={{ fontSize: 11, letterSpacing: '0.06em', marginBottom: 10 }}>DASHBOARD</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>
          Welcome back
        </h1>
        <p className="font-caption" style={{ fontSize: 13, marginBottom: 40 }}>
          {user.email}
        </p>

        {/* Tabs */}
        <div className="flex" style={{ gap: 4, marginBottom: 32, borderBottom: '1px solid var(--divider-light)', paddingBottom: 0 }}>
          {(['ideas', 'experiments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: activeTab === tab ? 400 : 300,
                color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                textTransform: 'capitalize',
              }}
            >
              {tab === 'ideas' ? `Saved Ideas (${ideas.length})` : `Experiments (${experiments.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}>
            <p className="font-caption">Loading...</p>
          </div>
        ) : activeTab === 'ideas' ? (
          ideas.length === 0 ? (
            <div className="text-center" style={{ padding: 60 }}>
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
                No saved ideas yet
              </p>
              <p className="font-caption" style={{ marginBottom: 24 }}>Research an idea and save it to see it here.</p>
              <button
                onClick={() => navigate('/')}
                className="rounded-[12px] transition-all duration-200 active:scale-[0.97]"
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'var(--accent-purple)',
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Start researching →
              </button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {ideas.map(idea => (
                <div
                  key={idea.id}
                  className="rounded-[12px] p-5 transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onClick={() => resumeIdea(idea)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <div className="flex items-start justify-between">
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {idea.idea_text}
                      </p>
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <span
                          className="rounded-full"
                          style={{
                            padding: '2px 10px',
                            fontSize: 11,
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 400,
                            color: stepColors[idea.current_step] || 'var(--text-muted)',
                            backgroundColor: `${stepColors[idea.current_step] || '#999'}10`,
                          }}
                        >
                          {idea.current_step}
                        </span>
                        <span className="font-caption" style={{ fontSize: 11 }}>
                          {new Date(idea.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : experiments.length === 0 ? (
          <div className="text-center" style={{ padding: 60 }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
              No experiments yet
            </p>
            <p className="font-caption">Start a validation experiment on any saved idea to track it here.</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {experiments.map(exp => {
              const sc = statusColors[exp.status] || statusColors.planned;
              return (
                <div
                  key={exp.id}
                  className="rounded-[12px] p-5"
                  style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
                      {exp.method_name}
                    </p>
                    <span className="rounded-full" style={{ padding: '2px 10px', fontSize: 11, fontWeight: 400, color: sc.color, backgroundColor: sc.bg }}>
                      {exp.status}
                    </span>
                  </div>
                  <p className="font-caption" style={{ fontSize: 12, marginBottom: 8 }}>{exp.idea_text}</p>
                  {exp.metrics && Object.keys(exp.metrics).length > 0 && (
                    <div className="flex flex-wrap" style={{ gap: 8 }}>
                      {Object.entries(exp.metrics).map(([key, val]) => (
                        <span key={key} className="rounded-[6px]" style={{ padding: '3px 8px', fontSize: 11, backgroundColor: 'var(--surface-input)', color: 'var(--text-secondary)' }}>
                          {key}: {String(val)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
