import { useEffect, useRef } from 'react';
import { TrendingUp, ShieldCheck, Languages, ArrowUpRight, CheckCircle2, MessageSquare } from 'lucide-react';
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
    theme: 'Clinic Wait Times & Appointment Delays',
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
      id="how-it-works"
      className="py-28 max-w-7xl mx-auto px-6 lg:px-8 border-t border-[#262626] bg-[#0a0a0a]"
    >
      {/* Section Header */}
      <div className="gsap-arch-header max-w-3xl space-y-3">
        <div className="badge-action-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          <span>How It Works</span>
        </div>

        <h2 className="font-serif font-light text-4xl sm:text-5xl lg:text-6xl text-white tracking-[-0.01em] leading-[1.08] text-balance">
          Know what your customers think.
          <span className="text-[#a3a3a3] italic font-serif font-light block mt-1.5">
            Without the guesswork.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed font-sans pt-1">
          RepScan brings together public feedback across your Google Maps and Instagram profiles,
          spots recurring problems before they hurt your ratings, and links every single takeaway
          back to the real customer review.
        </p>
      </div>

      {/* 3 High-Craft Cards in Surface #171717 */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Mixed Regional Languages */}
        <div className="gsap-arch-panel p-7 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center text-white">
                <Languages className="w-4 h-4 text-[#4ade80]" />
              </div>
              <span className="badge-neutral text-[10px]">
                Mixed Languages
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-light text-xl text-white tracking-tight">
                Understands how real customers talk
              </h3>
              <p className="text-xs text-[#a3a3a3] leading-relaxed font-sans">
                Customers rarely write in formal textbook English. RepScan understands mixed regional
                phrasing, casual dialect, and slang—so you never lose the real meaning behind a review.
              </p>
            </div>

            {/* Micro Demo Card */}
            <div className="p-4 rounded-xl bg-[#1f1f1f] border border-[#262626] space-y-2 text-xs">
              <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-[#737373]" />
                <span>Customer Review Example</span>
              </div>
              <p className="text-white font-sans text-xs italic">
                &ldquo;Doctor consultation chaala baavundi, but billing counter pe 35 min lag gaye.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[11px]">
                <span className="text-[#22c55e] font-medium flex items-center gap-1">
                  <span>✓</span> Doctor Care: Good
                </span>
                <span className="text-[#4ade80] font-medium flex items-center gap-1">
                  <span>!</span> Billing: Needs Attention
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#737373]">
            <span>Casual &amp; Regional Phrasing</span>
            <span className="text-white font-medium">Clear Sentiment</span>
          </div>
        </div>

        {/* Panel 2: Trend & Problem Spikes */}
        <div className="gsap-arch-panel p-7 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center text-white">
                <TrendingUp className="w-4 h-4 text-[#4ade80]" />
              </div>
              <span className="badge-neutral text-[10px]">
                Early Warning
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-light text-xl text-white tracking-tight">
                Catches recurring problems early
              </h3>
              <p className="text-xs text-[#a3a3a3] leading-relaxed font-sans">
                Never wonder whether a negative review was a one-off bad day or an emerging crisis.
                RepScan monitors trend velocity and flags sudden surges in complaints immediately.
              </p>
            </div>

            {/* Micro Trend Alert Display */}
            <div className="p-4 rounded-xl bg-[#1f1f1f] border border-[#262626] space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#a3a3a3]">Wait Time Complaints</span>
                <span className="text-[#4ade80] font-semibold">+24% Spike</span>
              </div>
              <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#4ade80] h-full rounded-full w-[78%]" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#737373] pt-0.5">
                <span>12 delays reported this weekend</span>
                <span className="text-[#4ade80]">Action Recommended</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#737373]">
            <span>Automatic Trend Alerts</span>
            <span className="text-white font-medium">No Manual Reading</span>
          </div>
        </div>

        {/* Panel 3: Verifiable Proof */}
        <div className="gsap-arch-panel p-7 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="badge-neutral text-[10px]">
                100% Verifiable
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-light text-xl text-white tracking-tight">
                Every insight links to the real review
              </h3>
              <p className="text-xs text-[#a3a3a3] leading-relaxed font-sans">
                You never have to guess whether an insight is real. Click any takeaway to inspect
                the actual customer review, complete with author name, date, and rating.
              </p>
            </div>

            {/* Clickable Citation Preview Button */}
            <div
              onClick={() => onOpenProof?.(auditSampleProof)}
              className="p-4 rounded-xl bg-[#1f1f1f] border border-[#262626] hover:border-[#404040] transition-colors cursor-pointer group/card space-y-2"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Rahul Sharma • Google Review</span>
                </span>
                <span className="text-[#4ade80] group-hover/card:underline inline-flex items-center gap-1 text-[11px]">
                  <span>View Review</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-[#a3a3a3] font-sans line-clamp-2">
                &ldquo;...the clinic was clean and doctor polite, but wait times exceeded 45 minutes past our scheduled appointment.&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#737373]">
            <span>Direct Customer Proof</span>
            <span className="text-white font-medium">Click to Verify</span>
          </div>
        </div>
      </div>
    </section>
  );
}
