import { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, Database } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface LandingCtaProps {
  onLaunchApp: () => void;
}

export default function LandingCta({ onLaunchApp }: LandingCtaProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.gsap-cta-content', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-t border-[#23252a] bg-[#010102]"
    >
      <div className="gsap-cta-content rounded-2xl bg-[#0f1011] border border-[#23252a] p-8 sm:p-14 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_16px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141516] border border-[#23252a] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-300 font-medium tracking-wider uppercase text-[11px]">
              VERIFIED OPERATIONS
            </span>
          </div>

          <h2 className="font-sans text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-[-0.035em] text-[#f7f8f8] leading-[1.08] text-balance">
            Clarity over sentiment scores.
            <span className="font-serif italic font-normal text-zinc-400 block mt-2">
              Root causes over guesswork.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#8a8f98] font-sans leading-relaxed">
            Connect your Google Maps and Instagram profiles. Start tracking statistical deltas,
            pinpoint operational bottlenecks, and make decisions backed by verifiable evidence.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-6 py-2.5 rounded-lg bg-[#f7f8f8] hover:bg-white text-[#010102] text-xs font-semibold tracking-tight transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-6 border-t border-[#23252a] flex flex-wrap items-center justify-center gap-6 text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>PostgreSQL + ChromaDB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Hallucinations Architecture</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
