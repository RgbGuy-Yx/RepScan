import { useEffect, useRef } from 'react';
import { Database, ShieldCheck, Languages, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ProofItem } from '../../types';

gsap.registerPlugin(ScrollTrigger);

interface LandingArchitectureProps {
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingArchitecture({ onOpenProof }: LandingArchitectureProps) {
  const containerRef = useRef<HTMLElement>(null);

  const auditSampleProof: ProofItem = {
    theme: 'Clinical Consultation Latency & Waiting Queue',
    author: 'Rahul Sharma',
    date: 'Sep 29, 2026',
    rating: 2,
    platform: 'Google Reviews',
    excerpt:
      'The clinic was extremely clean and doctor was polite, but wait times exceeded 45 minutes past our scheduled appointment slot. Need better scheduling coordination.',
    highlight: 'wait times exceeded 45 minutes',
    rawId: 'rev_08a9d4_fq849',
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.gsap-arch-header', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.gsap-arch-panel', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
          once: true,
        },
        y: 36,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="architecture"
      className="py-28 max-w-7xl mx-auto px-6 lg:px-8 border-t border-[#23252a] bg-[#010102]"
    >
      {/* Section Header */}
      <div className="gsap-arch-header max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f1011] border border-[#23252a] text-xs font-mono shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-zinc-300 font-medium tracking-wider uppercase text-[11px]">
            CORE ARCHITECTURE
          </span>
        </div>

        <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-[#f7f8f8] leading-[1.1] text-balance">
          Engineered for ground truth.
          <span className="font-serif italic font-normal text-zinc-400 block mt-1.5">
            Not plausible fiction.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed font-sans pt-1">
          Traditional LLMs invent summaries when prompted. RepScan operates as a deterministic
          pipeline: multi-channel ingestion, 2σ statistical anomaly detection, and cryptographic
          citation grounding.
        </p>
      </div>

      {/* 3 High-Craft Architectural Panels */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Code-Mixed Regional NLU */}
        <div className="gsap-arch-panel p-6 sm:p-7 rounded-2xl bg-[#0f1011] border border-[#23252a] hover:border-zinc-700/80 transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-center text-zinc-300">
                <Languages className="w-4 h-4 text-sky-400" />
              </div>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded bg-[#141516] border border-[#23252a]">
                Multi-Dialect
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-sans text-base font-semibold text-[#f7f8f8] tracking-tight">
                Code-Mixed Regional NLU
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-sans">
                Real customers don't write in textbook English. RepScan natively parses Hinglish,
                Telugu-English, and Tamil-English without semantic degradation.
              </p>
            </div>

            {/* Micro Demo Card */}
            <div className="p-3.5 rounded-xl bg-[#141516] border border-[#23252a] space-y-2 text-xs font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Raw Input</div>
              <p className="text-zinc-200 font-sans text-xs italic">
                &ldquo;Doctor consultation chaala baavundi, but billing counter pe 35 min lag gaye.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#23252a] flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-mono">Care: Positive</span>
                <span className="text-rose-400 font-mono">Billing: Friction Alert</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#23252a] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Sarvam NLU Engine</span>
            <span>Zero Lost Context</span>
          </div>
        </div>

        {/* Panel 2: Statistical Anomaly Detection */}
        <div className="gsap-arch-panel p-6 sm:p-7 rounded-2xl bg-[#0f1011] border border-[#23252a] hover:border-zinc-700/80 transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-center text-zinc-300">
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded bg-[#141516] border border-[#23252a]">
                Mathematical 2σ
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-sans text-base font-semibold text-[#f7f8f8] tracking-tight">
                What Changed Velocity Math
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-sans">
                Never guess whether a negative review is isolated noise or an emerging crisis.
                Our algorithm isolates statistical velocity spikes against historical crawl baselines.
              </p>
            </div>

            {/* Micro Telemetry Display */}
            <div className="p-3.5 rounded-xl bg-[#141516] border border-[#23252a] space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Shift Magnitude</span>
                <span className="text-rose-400 font-semibold">+24% Spike</span>
              </div>
              <div className="w-full bg-[#1e2023] h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full w-[78%]" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                <span>p = 0.003 (Significant)</span>
                <span>Threshold: &gt; 2σ</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#23252a] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Deterministic Deltas</span>
            <span>PostgreSQL Compute</span>
          </div>
        </div>

        {/* Panel 3: Cryptographic Grounding Trace */}
        <div className="gsap-arch-panel p-6 sm:p-7 rounded-2xl bg-[#0f1011] border border-[#23252a] hover:border-zinc-700/80 transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-center text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded bg-[#141516] border border-[#23252a]">
                Zero Hallucinations
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-sans text-base font-semibold text-[#f7f8f8] tracking-tight">
                Direct Citation Grounding
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-sans">
                Every executive summary sentence is backed by an immutable foreign key pointing to the
                verifiable customer review UUID in your database.
              </p>
            </div>

            {/* Clickable Citation Preview Button */}
            <div
              onClick={() => onOpenProof?.(auditSampleProof)}
              className="p-3.5 rounded-xl bg-[#141516] border border-[#23252a] hover:border-zinc-600 transition-colors cursor-pointer group/card space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Citation: rev_08a9d4
                </span>
                <span className="text-emerald-400 group-hover/card:underline inline-flex items-center gap-1 text-[11px]">
                  <span>Inspect</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-[#8a8f98] font-sans line-clamp-2">
                &ldquo;...wait times exceeded 45 minutes past our scheduled appointment slot.&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#23252a] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>RAG Citation Engine</span>
            <span>100% Auditable</span>
          </div>
        </div>
      </div>
    </section>
  );
}
