import { forwardRef } from 'react';

type SectionType = 'opportunity' | 'customers' | 'competitors' | 'rootcause' | 'costs' | 'risk' | 'location' | 'moat' | 'default';

interface Props {
  label?: string;
  section?: SectionType;
}

function Pulse({ w, h = 14, r = 6, delay = 0, className = '' }: { w: number | string; h?: number; r?: number; delay?: number; className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        height: h,
        width: typeof w === 'number' ? w : w,
        maxWidth: '100%',
        borderRadius: r,
        backgroundColor: 'hsl(var(--muted))',
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

function CardShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {['TAM', 'SAM', 'SOM'].map((tier, i) => (
        <CardShell key={tier}>
          <div className="flex items-center gap-2 mb-3">
            <Pulse w={32} h={10} delay={i * 100} />
            <div style={{ width: 1, height: 10 }} className="bg-border" />
            <Pulse w={80} h={10} delay={i * 100 + 50} />
          </div>
          <Pulse w={140} h={28} r={4} delay={i * 100 + 100} />
          <div className="mt-3">
            <Pulse w="80%" h={12} delay={i * 100 + 200} />
          </div>
        </CardShell>
      ))}
      <div className="mt-6">
        <Pulse w={120} h={10} delay={400} />
        <CardShell className="mt-3">
          <div style={{ height: 160 }} className="flex items-end justify-center gap-4 px-4">
            {[60, 80, 100].map((h, i) => (
              <Pulse key={i} w={48} h={h} r={4} delay={500 + i * 100} />
            ))}
          </div>
        </CardShell>
      </div>
      <div className="mt-4">
        <Pulse w={100} h={10} delay={700} />
        <CardShell className="mt-3">
          <div className="flex flex-col gap-2">
            {[90, 72, 56, 40, 24].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <Pulse w={60} h={10} delay={800 + i * 80} />
                <Pulse w={`${w}%`} h={24} r={3} delay={800 + i * 80 + 40} />
              </div>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div>
      <div className="flex gap-2 mb-8">
        {[80, 100, 90, 70].map((w, i) => (
          <Pulse key={i} w={w} h={32} r={8} delay={i * 80} />
        ))}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CardShell>
            <Pulse w={160} h={18} delay={200} />
            <Pulse w={100} h={12} delay={250} className="mt-2" />
            <Pulse w="100%" h={14} delay={300} className="mt-4" />
            <Pulse w="85%" h={14} delay={350} className="mt-2" />
            <div className="mt-5">
              <Pulse w={80} h={10} delay={400} />
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Pulse key={i} w={22} h={6} r={2} delay={450 + i * 30} />
                ))}
              </div>
            </div>
            <div className="mt-5">
              <Pulse w={90} h={10} delay={600} />
              <Pulse w={120} h={24} r={12} delay={650} className="mt-2" />
            </div>
          </CardShell>
        </div>
        <div className="lg:w-[280px] flex-shrink-0 flex flex-col gap-3">
          <CardShell>
            <Pulse w={80} h={10} delay={300} className="mx-auto" />
            <div className="mt-3 flex items-center justify-center">
              <Pulse w={200} h={200} r={100} delay={400} />
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}

function CompetitorsSkeleton() {
  return (
    <div>
      <Pulse w={100} h={10} delay={0} />
      <CardShell className="mt-3 mb-8">
        <div style={{ height: 200 }} className="flex items-center justify-center">
          <div className="relative" style={{ width: '100%', height: '100%' }}>
            {[
              { x: 20, y: 30, s: 24 },
              { x: 55, y: 60, s: 20 },
              { x: 75, y: 25, s: 28 },
              { x: 40, y: 70, s: 18 },
            ].map((dot, i) => (
              <Pulse key={i} w={dot.s} h={dot.s} r={dot.s} delay={100 + i * 120} className="absolute" />
            ))}
          </div>
        </div>
      </CardShell>
      {[0, 1, 2].map(i => (
        <CardShell key={i} className="mb-2">
          <div className="flex items-start gap-4">
            <Pulse w={36} h={36} r={18} delay={400 + i * 100} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Pulse w={120} h={14} delay={450 + i * 100} />
                <Pulse w={60} h={16} r={8} delay={500 + i * 100} />
              </div>
              <Pulse w={160} h={12} delay={550 + i * 100} />
            </div>
          </div>
        </CardShell>
      ))}
    </div>
  );
}

function RootCauseSkeleton() {
  return (
    <div>
      <div className="flex gap-3 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
            <Pulse w={30} h={20} r={4} delay={i * 80} className="mx-auto" />
            <Pulse w={40} h={10} r={4} delay={i * 80 + 50} className="mx-auto mt-2" />
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map(i => (
        <CardShell key={i} className="mb-2">
          <div className="flex items-start gap-4">
            <Pulse w={28} h={28} r={14} delay={300 + i * 100} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Pulse w={180} h={14} delay={350 + i * 100} />
                <Pulse w={44} h={16} r={8} delay={400 + i * 100} />
              </div>
              <Pulse w="75%" h={12} delay={450 + i * 100} />
            </div>
          </div>
        </CardShell>
      ))}
    </div>
  );
}

function CostsSkeleton() {
  return (
    <div>
      <CardShell className="mb-8">
        <Pulse w={120} h={10} delay={0} />
        <div className="flex items-baseline gap-3 mt-3">
          <Pulse w={100} h={28} r={4} delay={100} />
          <Pulse w={20} h={14} r={4} delay={150} />
          <Pulse w={100} h={28} r={4} delay={200} />
        </div>
        <Pulse w={180} h={12} delay={300} className="mt-3" />
      </CardShell>
      <Pulse w={100} h={10} delay={350} />
      <CardShell className="mt-3 mb-8">
        <div className="flex flex-col gap-3">
          {[200, 160, 140, 100, 80].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Pulse w={100} h={10} delay={400 + i * 60} />
              <Pulse w={w} h={20} r={3} delay={400 + i * 60 + 30} />
            </div>
          ))}
        </div>
      </CardShell>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between py-3 px-1 border-b border-border">
          <Pulse w={120} h={12} delay={700 + i * 60} />
          <Pulse w={100} h={12} delay={730 + i * 60} />
        </div>
      ))}
    </div>
  );
}

function RiskSkeleton() {
  return (
    <div>
      <CardShell className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Pulse w={140} h={10} delay={0} />
        </div>
        <Pulse w="90%" h={14} delay={100} />
        <Pulse w="60%" h={14} delay={150} className="mt-1" />
      </CardShell>
      <Pulse w={160} h={10} delay={200} />
      <div className="mt-3 mb-8 rounded-xl border border-border bg-card p-4" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', gap: 2, height: 240 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Pulse key={i} w="100%" h={60} r={8} delay={300 + i * 40} className="col-start-auto" />
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <CardShell key={i} className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Pulse w={160} h={14} delay={600 + i * 80} />
            <Pulse w={50} h={16} r={8} delay={650 + i * 80} />
          </div>
          <div className="flex gap-4">
            <Pulse w={80} h={11} delay={700 + i * 80} />
            <Pulse w={60} h={11} delay={720 + i * 80} />
          </div>
        </CardShell>
      ))}
    </div>
  );
}

function LocationSkeleton() {
  return (
    <div>
      <CardShell className="mb-8">
        <div className="flex items-center gap-6">
          <Pulse w={64} h={64} r={32} delay={0} />
          <div className="flex-1">
            <Pulse w={80} h={10} delay={100} />
            <Pulse w="80%" h={14} delay={200} className="mt-2" />
          </div>
        </div>
      </CardShell>
      <Pulse w={100} h={10} delay={250} />
      <div className="grid gap-2 mt-3 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {[0, 1, 2, 3].map(i => (
          <CardShell key={i}>
            <Pulse w={80} h={10} delay={300 + i * 60} />
            <Pulse w={60} h={20} r={4} delay={350 + i * 60} className="mt-2" />
          </CardShell>
        ))}
      </div>
      <Pulse w={140} h={10} delay={600} />
      <CardShell className="mt-3">
        <div className="flex flex-wrap gap-2 mb-4">
          {[80, 100, 70].map((w, i) => (
            <Pulse key={i} w={w} h={24} r={12} delay={650 + i * 60} />
          ))}
        </div>
        <div className="flex gap-8">
          <div>
            <Pulse w={60} h={10} delay={800} />
            <Pulse w={50} h={18} r={4} delay={850} className="mt-1" />
          </div>
          <div>
            <Pulse w={90} h={10} delay={900} />
            <Pulse w={50} h={18} r={4} delay={950} className="mt-1" />
          </div>
        </div>
      </CardShell>
    </div>
  );
}

function MoatSkeleton() {
  return (
    <div>
      <CardShell className="mb-8">
        <div className="flex items-center gap-6">
          <Pulse w={72} h={72} r={36} delay={0} />
          <div className="flex-1">
            <Pulse w={80} h={10} delay={100} />
            <Pulse w="80%" h={14} delay={200} className="mt-2" />
          </div>
        </div>
      </CardShell>
      <Pulse w={140} h={10} delay={250} />
      <CardShell className="mt-3 mb-8">
        <div className="flex items-center justify-center" style={{ height: 260 }}>
          <Pulse w={220} h={220} r={110} delay={300} />
        </div>
      </CardShell>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <CardShell>
          <Pulse w={60} h={10} delay={500} />
          <Pulse w={100} h={14} delay={550} className="mt-2" />
        </CardShell>
        <CardShell>
          <Pulse w={50} h={10} delay={600} />
          <Pulse w={90} h={14} delay={650} className="mt-2" />
        </CardShell>
      </div>
      {[0, 1, 2, 3].map(i => (
        <CardShell key={i} className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <Pulse w={120} h={13} delay={700 + i * 80} />
            <Pulse w={40} h={13} delay={730 + i * 80} />
          </div>
          <Pulse w="100%" h={3} r={2} delay={760 + i * 80} />
          <Pulse w="70%" h={12} delay={800 + i * 80} className="mt-2" />
        </CardShell>
      ))}
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[260, 180, 220].map((w, i) => (
        <Pulse key={i} w={w} h={14} delay={i * 150} className="mx-auto" />
      ))}
      <Pulse w="100%" h={120} r={12} delay={450} className="mt-4" />
    </div>
  );
}

const SKELETON_MAP: Record<SectionType, () => JSX.Element> = {
  opportunity: OpportunitySkeleton,
  customers: CustomersSkeleton,
  competitors: CompetitorsSkeleton,
  rootcause: RootCauseSkeleton,
  costs: CostsSkeleton,
  risk: RiskSkeleton,
  location: LocationSkeleton,
  moat: MoatSkeleton,
  default: DefaultSkeleton,
};

const SectionSkeleton = forwardRef<HTMLDivElement, Props>(({ label, section = 'default' }, ref) => {
  const SkeletonContent = SKELETON_MAP[section] || DefaultSkeleton;

  return (
    <div ref={ref} style={{ padding: '24px 0' }}>
      {label && (
        <p className="text-center mb-6" style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'hsl(var(--muted-foreground))',
        }}>
          {label}
        </p>
      )}
      <SkeletonContent />
    </div>
  );
});

SectionSkeleton.displayName = 'SectionSkeleton';

export default SectionSkeleton;
