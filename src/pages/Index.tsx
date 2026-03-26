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
  { label: 'Ideas researched', value: '2,400+', note: 'Business concepts tested across local and digital categories' },
  { label: 'Average time to insights', value: '12 min', note: 'From rough idea to demand, market, cost, and validation view' },
  { label: 'Would use it again', value: '89%', note: 'Founders who said the output clarified their next move' },
];

const sections = [
  {
    eyebrow: 'Discover',
    title: 'Customer signals',
    body: "Real complaints, wishes, and gaps from Reddit, Yelp, and local forums. Not guesses, direct quotes from people who want what you're building.",
    evidence: [
      { title: 'Pain points', body: 'Repeated complaints, unmet needs, and patterns of frustration grouped into actionable themes.' },
      { title: 'Proof', body: 'Direct customer language, source links, and platform context so you can judge the evidence yourself.' },
    ],
  },
  {
    eyebrow: 'Analyze',
    title: 'Market reality',
    body: 'Competitors, market size, customer segments, and why this gap still exists. The goal is to turn scattered evidence into a clear business case.',
    evidence: [
      { title: 'Opportunity sizing', body: 'TAM, SAM, SOM, and a customer funnel that makes the market feel operational instead of abstract.' },
      { title: 'Competitive gaps', body: 'A clearer read on where incumbent offers are weak and where a realistic opening may exist.' },
    ],
  },
  {
    eyebrow: 'Setup',
    title: 'Launch costs',
    body: 'Specific startup ranges, suppliers, staffing assumptions, and timeline guidance grounded in the business you described and the market you chose.',
    evidence: [
      { title: 'Budget reality', body: 'Cost ranges and category breakdowns that help you understand the likely minimum and practical starting budget.' },
      { title: 'Execution plan', body: 'A clearer sequence for launch readiness, suppliers, hiring, and operational setup.' },
    ],
  },
  {
    eyebrow: 'Validate',
    title: 'Validation toolkit',
    body: 'A set of practical demand tests like landing pages, surveys, outreach, communities, and scorecards so you can decide whether to proceed, refine, or walk away.',
    evidence: [
      { title: 'Demand testing', body: 'Validation methods tailored to the offer, customer pain, and buying behavior.' },
      { title: 'Decision support', body: 'Artifacts that help you interpret signal strength without guessing from scattered responses.' },
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
        title={<>Don&apos;t build something nobody wants.</>}
        body={
          <p>
            Describe your idea. Get real customer signals, market gaps, launch costs, and a validation plan in about ten minutes.
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

      <SectionCard eyebrow="What you get" title="One sentence in. A complete plan out." readingWidth>
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
