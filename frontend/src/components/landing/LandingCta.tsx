import { ArrowRight, Sparkles } from 'lucide-react';

interface LandingCtaProps {
  onLaunchApp: () => void;
}

export default function LandingCta({ onLaunchApp }: LandingCtaProps) {
  return (
    <section className="py-20 max-w-6xl mx-auto px-6 lg:px-8 border-t border-zinc-800/80">
      <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-8 sm:p-14 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-emerald-500/[0.04] blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RepScan Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight">
            Stop guessing what your customers are telling you.
          </h2>

          <div className="mt-4 text-base sm:text-lg text-zinc-400 font-normal leading-relaxed space-y-1">
            <p>Understand the signals behind your reviews.</p>
            <p className="text-zinc-200 font-medium">See what changed. See the proof. Take action.</p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-6 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Explore RepScan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
