import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIdea } from '@/context/IdeaContext';
import {
  AppShell,
  EvidenceList,
  HeroSection,
  IdeaInputCard,
  PillButton,
  ScoreSummaryCard,
  SectionCard,
  SecondaryButton,
  TopNav,
} from '@/components/system/editorial';

const examples = [
  'A fresh-pressed juice bar in Plano, Texas',
  'An AI-powered tutoring app for high school students',
  'An authentic Thai street food restaurant in Dallas',
];

const buildMeasureLearn = [
  {
    title: 'Build',
    body: 'Founders know they should validate before they build. The problem is that validation usually begins with slow, scattered research.',
  },
  {
    title: 'Measure',
    body: 'LaunchLean compresses the evidence-gathering step from weeks into minutes by structuring customer signals, market logic, operating assumptions, and test methods in one flow.',
  },
  {
    title: 'Learn',
    body: 'You leave with a clearer go, refine, or stop decision and a practical validation sequence you can run with real people right away.',
  },
];

const sections = [
  {
    eyebrow: 'Discover',
    title: 'What are people already telling you?',
    body: 'Customer language, source-backed demand signals, and patterns from the market so you can stop reading scattered threads and start with evidence.',
  },
  {
    eyebrow: 'Analyze',
    title: 'Is this opportunity strong enough to pursue?',
    body: 'A business case built from market size, customer segments, risk, competition, and strategic tradeoffs, so you can judge the idea like an operator.',
  },
  {
    eyebrow: 'Setup',
    title: 'What would it take to launch well?',
    body: 'A grounded operating recommendation covering costs, suppliers, founder focus, and rollout logic, so the idea feels executable instead of abstract.',
  },
  {
    eyebrow: 'Validate',
    title: 'What should you test next?',
    body: 'A shorter path from evidence to action with concrete validation methods, assets, and handoff into the dashboard for experiment tracking.',
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setIdea } = useIdea();
  const [ideaInput, setIdeaInput] = useState('');

  const normalized = useMemo(() => ideaInput.trim(), [ideaInput]);

  const startResearch = () => {
    if (!normalized) return;
    setIdea(normalized);
    navigate('/research');
  };

  return (
    <AppShell
      nav={
        <TopNav
          rightSlot={
            <>
              <SecondaryButton onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Dashboard' : 'Log in'}
              </SecondaryButton>
            </>
          }
        />
      }
    >
      <HeroSection
        eyebrow="Founder Research Workspace"
        title={<>Don&apos;t build something nobody wants.</>}
        body={
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Stop researching. Start validating.
            </p>
            <p style={{ margin: 0 }}>
              Research is passive. Validation is active. LaunchLean handles the evidence gathering so you can move into demand testing faster and decide with less drift.
            </p>
          </div>
        }
      />

      <IdeaInputCard
        title="Describe the business in one clear sentence"
        description="Use plain business language. Mention the offer, customer, and market if you know them."
      >
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <textarea
            value={ideaInput}
            onChange={(event) => setIdeaInput(event.target.value)}
            rows={4}
            placeholder="A fresh-pressed juice bar in Plano, Texas"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              padding: '1rem 1.1rem',
              minHeight: '140px',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {examples.map((example) => (
              <SecondaryButton key={example} onClick={() => setIdeaInput(example)}>
                {example}
              </SecondaryButton>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
            <p className="section-copy" style={{ margin: 0, maxWidth: 620 }}>
              The best prompts name the business model, target customer, and location when location matters.
            </p>
            <PillButton onClick={startResearch} active={!!normalized}>
              Research this idea
            </PillButton>
          </div>
        </div>
      </IdeaInputCard>

      <SectionCard eyebrow="Workflow" title="A tighter path from signal to decision" readingWidth>
        <div style={{ display: 'grid', gap: 'var(--space-12)' }}>
          {sections.map((section) => (
            <div key={section.eyebrow} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <p className="eyebrow">{section.eyebrow}</p>
                <h3 className="section-title">{section.title}</h3>
                <p className="section-copy" style={{ marginTop: 'var(--space-3)', fontSize: '0.9375rem', lineHeight: 1.75 }}>{section.body}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Why this exists" title="Momentum dies when validation takes too long" readingWidth>
        <EvidenceList
          items={[
            {
              title: 'The problem',
              body: <p style={{ margin: 0 }}>Founders do not need another reminder to validate. They need a faster way to get from idea to evidence without losing momentum.</p>,
            },
            {
              title: 'The role of LaunchLean',
              body: <p style={{ margin: 0 }}>LaunchLean compresses the measure step, so you can learn faster and decide whether to build, change direction, or stop.</p>,
            },
            {
              title: 'The outcome',
              body: <p style={{ margin: 0 }}>The output is not just research. It is a tighter validation sequence grounded in customer language, market logic, and launch reality.</p>,
            },
          ]}
        />
      </SectionCard>
    </AppShell>
  );
}
