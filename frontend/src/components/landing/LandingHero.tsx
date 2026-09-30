import { ArrowRight, Sparkles } from 'lucide-react';
import type { ProofItem } from '../../types';
import { CrowdCanvas } from '@/components/ui/skiper39';

interface LandingHeroProps {
  onLaunchApp: () => void;
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingHero({ onLaunchApp }: LandingHeroProps) {
  return (
    <section className="relative w-full min-h-[85vh] sm:min-h-[90vh] flex flex-col justify-center items-center py-24 px-6 lg:px-8 text-center overflow-hidden">
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
            opacity: 0.45,
          }}
        />
        {/* Radial vignette for headline contrast and linear gradient blend */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_50%,rgba(1,1,2,0.85)_0%,rgba(1,1,2,0.45)_55%,rgba(1,1,2,0.95)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#010102]/60 via-transparent to-[#010102]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* 1. Eyebrow Taxonomy Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141516]/90 backdrop-blur-md border border-[#23252a] text-[#8a8f98] text-xs font-medium mb-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
          <span className="text-[#f7f8f8] font-medium">RepScan</span>
          <span className="text-[#3e3e44]">/</span>
          <span className="text-[#8a8f98]">Evidence-Backed Review Intelligence</span>
          <Sparkles className="w-3.5 h-3.5 text-[#828fff] ml-0.5" />
        </div>

        {/* 2. Display Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-semibold tracking-[-0.04em] text-[#f7f8f8] leading-[1.08] text-balance">
          Understand what your customers are really saying.
        </h1>

        {/* 3. Subhead */}
        <p className="mt-6 max-w-2xl text-base sm:text-lg text-[#8a8f98] font-normal leading-relaxed">
          RepScan turns customer reviews into clear, evidence-backed insights — showing you what changed, why it changed, and what you can do about it.
        </p>

        {/* 4. Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onLaunchApp}
            className="linear-btn-primary text-sm h-10 px-5 font-medium flex items-center gap-2 shadow-[0_2px_12px_rgba(94,106,210,0.35)] cursor-pointer"
          >
            <span>See What Changed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <a
            href="#how-it-works"
            className="linear-btn-secondary text-sm h-10 px-5 font-medium flex items-center"
          >
            How RepScan Works
          </a>
        </div>
      </div>
    </section>
  );
}
