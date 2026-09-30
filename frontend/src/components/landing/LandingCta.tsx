import { ArrowRight, Sparkles } from 'lucide-react';

interface LandingCtaProps {
  onLaunchApp: () => void;
}

export default function LandingCta({ onLaunchApp }: LandingCtaProps) {
  return (
    <section className="py-20 max-w-6xl mx-auto px-6 lg:px-8 border-t border-[#23252a]">
      <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-8 sm:p-14 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-[#5e6ad2]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141516] border border-[#23252a] text-[#828fff] text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RepScan Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
            Stop guessing what your customers are telling you.
          </h2>

          <div className="mt-4 text-base sm:text-lg text-[#8a8f98] font-normal leading-relaxed space-y-1">
            <p>Understand the signals behind your reviews.</p>
            <p className="text-[#f7f8f8] font-medium">See what changed. See the proof. Take action.</p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLaunchApp}
              className="linear-btn-primary text-sm h-10 px-6 font-medium flex items-center gap-2 shadow-[0_2px_12px_rgba(94,106,210,0.35)] cursor-pointer"
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
