import { useEffect, useRef } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import gsap from 'gsap';
import type { ProofItem } from '../../types';
import { CrowdCanvas } from '../ui/skiper39';

interface LandingHeroProps {
  onLaunchApp: () => void;
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingHero({ onLaunchApp }: LandingHeroProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.gsap-hero-eyebrow', {
        y: -16,
        opacity: 0,
        duration: 0.7,
      })
        .from(
          '.gsap-hero-title',
          {
            y: 32,
            opacity: 0,
            duration: 0.9,
          },
          '-=0.4'
        )
        .from(
          '.gsap-hero-subhead',
          {
            y: 24,
            opacity: 0,
            duration: 0.8,
          },
          '-=0.5'
        )
        .from(
          '.gsap-hero-actions',
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          '-=0.5'
        )
        .from(
          '.gsap-hero-cards',
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          '-=0.4'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[94vh] flex flex-col justify-center items-center pt-28 pb-20 px-6 lg:px-8 text-center overflow-hidden bg-[#0a0a0a]"
    >
      {/* Precision Subtle Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Crowd Canvas Animation covering the entire Hero Background */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <CrowdCanvas
          src="/openpeeps.png"
          rows={15}
          cols={7}
          className="w-full h-full block"
          style={{
            filter: 'invert(1) contrast(1.15)',
            opacity: 0.32,
          }}
        />
        {/* Radial vignette for headline contrast and canvas blend */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_50%,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0.45)_55%,rgba(10,10,10,0.96)_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-transparent to-[#0a0a0a] pointer-events-none" />
      </div>

      {/* Subtle top and bottom vignettes */}
      <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none z-0" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Eyebrow Status Badge with action light green Signal */}
        <div className="gsap-hero-eyebrow inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#171717] border border-[#262626] text-xs mb-8 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          <span className="text-[#ffffff] font-medium tracking-tight">Customer Reputation</span>
          <span className="text-[#737373]">/</span>
          <span className="text-[#a3a3a3]">Google Maps &amp; Instagram Reviews</span>
        </div>

        {/* Display Headline with Strict Light Editorial Serif (Design.md) */}
        <h1 className="gsap-hero-title font-serif font-light text-5xl sm:text-6xl lg:text-7xl tracking-[-0.02em] text-[#ffffff] leading-[1.04] text-balance">
          Customer feedback, stripped of noise.
          <br />
          <span className="text-[#a3a3a3] italic font-serif font-light">
            Grounded in verifiable proof.
          </span>
        </h1>

        {/* Body Subhead — Simple, direct, non-AI customer language */}
        <p className="gsap-hero-subhead mt-6 max-w-2xl text-base sm:text-lg text-[#a3a3a3] font-normal leading-relaxed font-sans">
          RepScan brings together your reviews from Google Maps and Instagram, catches recurring
          complaints early, and connects every insight directly to the original customer review.
        </p>

        {/* Action CTAs — Pill Buttons */}
        <div className="gsap-hero-actions mt-8 flex flex-wrap items-center justify-center gap-3 font-sans">
          <button
            type="button"
            onClick={onLaunchApp}
            className="btn-pill-primary px-7 py-3 text-sm shadow-sm active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <a
            href="#how-it-works"
            className="btn-pill-secondary px-6 py-3 text-sm active:scale-[0.98]"
          >
            See How It Works
          </a>
        </div>

        {/* Rating & Platform Cards floating above canvas */}
        <div className="gsap-hero-cards mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* Card 1: Google Reviews Platform Rating */}
          <div className="p-5 rounded-2xl bg-[#171717]/75 backdrop-blur-md border border-[#262626] hover:border-[#404040] transition-colors text-left flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
                  Google Maps Reviews
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif font-light text-3xl text-white tracking-tight">4.9</span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#737373] mt-1">14,800+ customer reviews parsed</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="badge-action-subtle">Live Sync</span>
            </div>
          </div>

          {/* Card 2: Instagram Feedback */}
          <div className="p-5 rounded-2xl bg-[#171717]/75 backdrop-blur-md border border-[#262626] hover:border-[#404040] transition-colors text-left flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                <span className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
                  Instagram Feedback
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif font-light text-3xl text-white tracking-tight">96.4%</span>
                <span className="text-xs font-mono text-[#22c55e]">resolved</span>
              </div>
              <p className="text-xs text-[#737373] mt-1">38,200+ comments analyzed</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="badge-action-subtle">Continuous</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
