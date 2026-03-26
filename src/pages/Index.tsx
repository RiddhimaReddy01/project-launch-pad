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

const scoreStats = [
  { label: 'Founder decision time', value: '10 min', note: 'From idea to first recommendation set' },
  { label: 'Research lanes', value: '4', note: 'Discover, Analyze, Setup, Validate' },
  { label: 'Evidence sources', value: 'Multi-source', note: 'Customer quotes, communities, and local market signals' },
];

const sections = [
  {
    eyebrow: 'Discover',
    title: 'Start with customer language, not founder assumptions',
    body: 'Launch Lean opens with demand signals, pain points, workarounds, and market gaps pulled into a readable research brief. You see what people actually say, where they say it, and how often the pattern shows up.',
    evidence: [
      { title: 'Pain points', body: 'Repeated operational frustrations, unmet expectations, and local complaints grouped into usable themes.' },
      { title: 'Demand signals', body: 'Mentions of urgency, willingness to pay, and active search behavior that point to real market pull.' },
    ],
  },
  {
    eyebrow: 'Analyze',
    title: 'Turn scattered signals into market structure',
    body: 'The analysis flow reframes raw evidence into market sizing, customer segments, competitive gaps, root causes, and a clear customer funnel. The goal is strategic clarity, not just more data.',
    evidence: [
      { title: 'Opportunity sizing', body: 'TAM, SAM, SOM, and a conversion funnel that makes market size feel operational.' },
      { title: 'Competitive landscape', body: 'Direct competitors, structural gaps, and where the opening may actually exist.' },
    ],
  },
  {
    eyebrow: 'Setup',
    title: 'Map the launch motion before you spend',
    body: 'Costs, suppliers, team needs, and timeline are organized into a realistic first-launch plan. That keeps the research grounded in feasibility, not just ambition.',
    evidence: [
      { title: 'Operating assumptions', body: 'Budget ranges, recommended vendors, and staffing plans based on your chosen launch posture.' },
      { title: 'Execution roadmap', body: 'A phased path from initial build-out to launch readiness, with practical sequencing.' },
    ],
  },
  {
    eyebrow: 'Validate',
    title: 'Finish with a concrete validation plan',
    body: 'The toolkit translates research into demand tests: landing pages, surveys, outreach, communities, and scorecards. It is built to answer one question clearly: should you proceed, refine, or stop?',
    evidence: [
      { title: 'Demand testing', body: 'Validation methods tailored to business model, pain intensity, and buyer behavior.' },
      { title: 'Founder decision support', body: 'Artifacts that help you interpret signal strength instead of guessing from scattered feedback.' },
    ],
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
        title={<>Understand demand before you commit capital, time, or product effort.</>}
        body={
          <p>
            Launch Lean turns a rough business concept into a warm, readable research narrative: customer demand,
            market structure, operating setup, and validation strategy. It is designed for founder decisions, not dashboard theater.
          </p>
        }
        aside={
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {scoreStats.map((stat) => (
              <ScoreSummaryCard key={stat.label} label={stat.label} value={stat.value} note={stat.note} />
            ))}
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

      <SectionCard eyebrow="What the app actually produces" title="A founder narrative, sequenced for decision-making" readingWidth>
        <div style={{ display: 'grid', gap: 'var(--space-12)' }}>
          {sections.map((section) => (
            <div key={section.eyebrow} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <p className="eyebrow">{section.eyebrow}</p>
                <h3 className="section-title" style={{ fontSize: '1.5rem' }}>{section.title}</h3>
                <p className="section-copy" style={{ marginTop: 'var(--space-3)' }}>{section.body}</p>
              </div>
              <EvidenceList items={section.evidence.map((item) => ({ title: item.title, body: <p style={{ margin: 0 }}>{item.body}</p> }))} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Decision lens" title="Built for founders who need signal, not noise" readingWidth>
        <EvidenceList
          items={[
            {
              title: 'Use the right terminology',
              body: <p style={{ margin: 0 }}>The product should speak in terms like demand validation, customer segments, serviceable market, competitive gaps, launch costs, and go-to-market testing.</p>,
            },
            {
              title: 'Keep the narrative linear',
              body: <p style={{ margin: 0 }}>You should be able to move from customer evidence to market structure to operating feasibility to validation methods without context switching.</p>,
            },
            {
              title: 'Preserve warmth and restraint',
              body: <p style={{ margin: 0 }}>The interface should feel premium and calm, with rounded surfaces, generous spacing, and minimal decoration.</p>,
            },
          ]}
        />
      </SectionCard>
    </AppShell>
  );
}
