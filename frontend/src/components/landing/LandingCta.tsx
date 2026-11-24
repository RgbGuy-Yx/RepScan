import { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
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
      className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-t border-[#262626] bg-[#0a0a0a]"
    >
      <div className="gsap-cta-content rounded-2xl bg-[#171717] border border-[#262626] p-8 sm:p-14 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="badge-action-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>Ready in Minutes</span>
          </div>

          <h2 className="font-serif font-light text-4xl sm:text-5xl lg:text-6xl text-white tracking-[-0.01em] leading-[1.08] text-balance">
            Clarity over confusion.
            <span className="text-[#a3a3a3] italic font-serif font-light block mt-2">
              Root causes over guesswork.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#a3a3a3] font-sans leading-relaxed">
            Connect your Google Maps and Instagram profiles in minutes. Spot recurring customer issues
            before they hurt your reputation, and make improvements backed by real customer feedback.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="btn-pill-primary px-8 py-3 text-sm shadow-md active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-8 border-t border-[#262626] flex flex-wrap items-center justify-center gap-6 text-[11px] text-[#737373]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>100% Real Customer Feedback</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Direct Review Links</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span>2-Minute Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
