import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
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
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[92vh] flex flex-col justify-center items-center pt-28 pb-20 px-6 lg:px-8 text-center overflow-hidden bg-[#010102]"
    >
      {/* Precision Subtle Background Grid — Handcrafted minimal lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] z-0"
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
            opacity: 0.35,
          }}
        />
        {/* Radial vignette for headline contrast and linear gradient blend */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_50%,rgba(1,1,2,0.85)_0%,rgba(1,1,2,0.45)_55%,rgba(1,1,2,0.95)_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#010102]/60 via-transparent to-[#010102] pointer-events-none" />
      </div>

      {/* Subtle top and bottom vignettes */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#010102] to-transparent pointer-events-none z-0" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#010102] to-transparent pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Eyebrow Status Badge */}
        <div className="gsap-hero-eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f1011] border border-[#23252a] text-xs font-mono mb-8 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-zinc-300 font-medium tracking-tight">RepScan Telemetry</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">Strictly Grounded NLU</span>
        </div>

        {/* Display Headline with Handcrafted Typography Pairing */}
        <h1 className="gsap-hero-title font-sans text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.035em] text-[#f7f8f8] leading-[1.08] text-balance">
          Customer feedback, stripped of noise.
          <br />
          <span className="font-serif italic font-normal text-zinc-400">
            And grounded in verifiable proof.
          </span>
        </h1>

        {/* Body Subhead — Direct, sharp, no marketing fluff */}
        <p className="gsap-hero-subhead mt-6 max-w-2xl text-base sm:text-lg text-[#8a8f98] font-normal leading-relaxed font-sans">
          RepScan continuously ingests public reviews from Google Maps and Instagram, catches
          emerging complaints via weekly anomaly math, and tethers every insight to the raw
          source sentence.
        </p>

        {/* Action CTAs */}
        <div className="gsap-hero-actions mt-8 flex flex-wrap items-center justify-center gap-3 font-sans">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-6 py-2.5 rounded-lg bg-[#f7f8f8] hover:bg-white text-[#010102] text-xs font-semibold tracking-tight transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <a
            href="#telemetry"
            className="px-5 py-2.5 rounded-lg bg-[#0f1011] hover:bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a] text-xs font-medium transition-all active:scale-[0.98] inline-flex items-center cursor-pointer"
          >
            See What Changed
          </a>
        </div>
      </div>
    </section>
  );
}
