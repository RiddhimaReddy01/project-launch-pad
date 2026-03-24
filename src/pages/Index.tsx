import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import Divider from '@/components/landing/Divider';
import Story from '@/components/landing/Story';
import WhatYouGet from '@/components/landing/WhatYouGet';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

function SocialProof() {
  const ref = useScrollReveal();
  const stats = [
    { value: '2,400+', label: 'Ideas researched' },
    { value: '12 min', label: 'Average time to insights' },
    { value: '89%', label: 'Would use it again' },
  ];

  return (
    <section ref={ref} className="scroll-reveal px-6 mx-auto" style={{ maxWidth: 600, marginTop: 80 }}>
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-heading" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Testimonial */}
      <div className="mt-12 rounded-[16px] p-8 text-center" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--divider-light)' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
          "I validated my coffee shop idea in 15 minutes. The market gaps alone saved me months of guesswork."
        </p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', marginTop: 16 }}>
          — Early beta user
        </p>
      </div>
    </section>
  );
}

const Index = () => {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Divider />
        <Story />
        <Divider />
        <WhatYouGet />
        <Divider />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
};

export default Index;
