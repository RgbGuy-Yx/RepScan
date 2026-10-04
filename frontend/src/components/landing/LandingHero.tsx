import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { ProofItem } from '../../types';
import googleIcon from '../../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';
import { CrowdCanvas } from '@/components/ui/skiper39';

interface LandingHeroProps {
  onLaunchApp: () => void;
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingHero({ onLaunchApp, onOpenProof: _onOpenProof }: LandingHeroProps) {
  return (
    <section className="relative w-full min-h-[100dvh] flex flex-col justify-center items-center py-24 px-6 lg:px-8 text-center overflow-hidden bg-zinc-950">
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_50%,rgba(9,9,11,0.85)_0%,rgba(9,9,11,0.45)_55%,rgba(9,9,11,0.95)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-transparent to-zinc-950" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Eyebrow Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-zinc-400 text-xs font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-200 font-medium">RepScan Intelligence</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">Evidence-Backed Review Analytics</span>
        </div>

        {/* Display Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tighter text-zinc-100 leading-[1.08] text-balance">
          Understand what your customers are <span className="text-zinc-400">really</span> saying.
        </h1>

        {/* Body Subhead */}
        <p className="mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 font-normal leading-relaxed">
          RepScan turns customer reviews into clear, evidence-backed insights, showing you what changed, why it changed, and what you can do about it.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onLaunchApp}
            className="px-6 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>See What Changed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <a
            href="#how-it-works"
            className="px-5 py-2.5 rounded-md bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-all active:scale-[0.98] inline-flex items-center cursor-pointer"
          >
            How RepScan Works
          </a>
        </div>

        {/* Live System Counter Strip */}
        <div className="mt-12 pt-6 flex flex-wrap items-center justify-center gap-6 border-t border-zinc-800/60 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain" />
            <span>Google Maps Integration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Grounded Citations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Multilingual NLU</span>
          </div>
        </div>
      </div>
    </section>
  );
}
