import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export default function Story() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="scroll-reveal px-6 mx-auto text-center" style={{ maxWidth: 500 }}>
      <p className="font-body" style={{ lineHeight: 1.8, fontSize: 15 }}>
        <span className="font-body-strong">Launch Lean</span> replaces weeks of Googling, scrolling Reddit, and building spreadsheets. Enter one sentence. We scan real customer conversations, size the opportunity, map competitors, estimate costs, and hand you a validation toolkit — all before you spend a dollar.
      </p>
    </section>
  );
}
