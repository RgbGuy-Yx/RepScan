import { useEffect, useRef } from 'react';
import { Quote, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ProofItem } from '../../types';

gsap.registerPlugin(ScrollTrigger);

interface LandingShowcaseProps {
  onOpenProof: (proof: ProofItem) => void;
}

interface EvidenceCard {
  id: string;
  badge: string;
  badgeStyle: string;
  quote: string;
  author: string;
  role: string;
  avatarUrl: string;
  proof: ProofItem;
}

export default function LandingShowcase({ onOpenProof }: LandingShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const column1Cards: EvidenceCard[] = [
    {
      id: 'c1',
      badge: '↓ 45 MIN WAIT DROPPED',
      badgeStyle: 'badge-success',
      quote:
        'Wait times during peak Friday evening hours exceeded 45 minutes past scheduled appointment slots. RepScan isolated the bottleneck within 48 hours and tethered it to 14 Google reviews. We rescheduled check-in slots and patient complaints vanished.',
      author: 'Dr. Rahul Sharma',
      role: 'Apex Healthcare • 8 months on RepScan',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
      proof: {
        theme: 'Clinical Consultation Latency & Waiting Queue',
        author: 'Rahul Sharma',
        date: 'Sep 29, 2026',
        rating: 2,
        platform: 'Google Reviews',
        excerpt:
          'The clinic was extremely clean and doctor was polite, but wait times exceeded 45 minutes past our scheduled appointment slot. Need better scheduling coordination.',
        highlight: 'wait times exceeded 45 minutes',
        rawId: 'rev_08a9d4_fq849',
      },
    },
    {
      id: 'c2',
      badge: 'INDIC NLU RESOLVED',
      badgeStyle: 'badge-action-subtle',
      quote:
        'Our patients write in Hinglish and Telugu-English: "Doctor consultation chaala baavundi but billing bahut slow tha". Other tools labelled this "Neutral". RepScan accurately isolated the pharmacy dispatch delay as a critical operational fix.',
      author: 'Sunita Varma',
      role: 'Apollo Wellness • 6 months on RepScan',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      proof: {
        theme: 'Pharmacy Billing Dispatch Speed',
        author: 'Sunita Varma',
        date: 'Oct 04, 2026',
        rating: 3,
        platform: 'Google Reviews',
        excerpt:
          'Doctor consultation chaala baavundi, skin allergy cleared quickly. But pharmacy billing bahut slow tha, took 35 minutes.',
        highlight: 'pharmacy billing bahut slow tha',
        rawId: 'rev_9f830b_in552',
      },
    },
  ];

  const column2Cards: EvidenceCard[] = [
    {
      id: 'c3',
      badge: '+28% RETENTION LIFT',
      badgeStyle: 'badge-success',
      quote:
        'Instead of scrolling through hundreds of disjointed comments across Google and Instagram, our team receives a concise weekly summary. We were able to confirm our menu update fixed customer billing confusion within 72 hours.',
      author: 'Arjun Mehta',
      role: 'Brew & Co. Operations • 1 year on RepScan',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      proof: {
        theme: 'Service Charge Transparency & Menu Pricing',
        author: 'Arjun Mehta',
        date: 'Oct 08, 2026',
        rating: 5,
        platform: 'Instagram',
        excerpt:
          'Updated menu clearly mentions service charge upfront now. Food was fantastic as always, great job team!',
        highlight: 'Updated menu clearly mentions service charge upfront',
        rawId: 'rev_27f10a_ig902',
      },
    },
    {
      id: 'c4',
      badge: '100% VERIFIABLE',
      badgeStyle: 'badge-action-subtle',
      quote:
        'Every single insight links directly to the original customer review. Our leadership team trusts RepScan because it never makes up summaries or hides negative feedback. You can verify every finding with one click.',
      author: 'Priya Nair',
      role: 'Chief Experience Officer • 4 months on RepScan',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      proof: {
        theme: 'Direct Source Links & Honest Feedback',
        author: 'Priya Nair',
        date: 'Sep 21, 2026',
        rating: 5,
        platform: 'Google Reviews',
        excerpt:
          'Clean, reliable reports with direct review links. We can present this data to directors with 100% confidence.',
        highlight: 'reliable reports with direct review links',
        rawId: 'rev_66d41c_cx104',
      },
    },
  ];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      // Animate left editorial panel
      gsap.from('.gsap-showcase-left', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true,
        },
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      // Animate right cards with staggered timing
      gsap.from('.gsap-showcase-card', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
          once: true,
        },
        y: 36,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="telemetry"
      className="py-28 max-w-7xl mx-auto px-6 lg:px-8 border-t border-[#262626] bg-[#0a0a0a]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Reference Layout Typography & Social Proof */}
        <div className="gsap-showcase-left lg:col-span-5 space-y-7 lg:sticky lg:top-28">
          {/* Eyebrow Pill */}
          <div className="badge-action-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>Proven In The Wild</span>
          </div>

          {/* Headline Pairing: Light Editorial Serif */}
          <h2 className="font-serif font-light text-4xl sm:text-5xl lg:text-6xl text-white tracking-[-0.01em] leading-[1.08] text-balance">
            Turn reviews into clear priorities.
            <span className="text-[#a3a3a3] italic font-serif font-light block mt-2">
              Proven by evidence.
            </span>
          </h2>

          {/* Editorial Paragraph */}
          <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed font-sans max-w-md">
            We don't do vague sentiment scores or generic summaries. Every recurring issue
            is grouped by specific topics—like staff speed, cleanliness, or billing—and tethered
            to real customer reviews you can open and verify.
          </p>

          {/* Avatar Pile + Star Rating Social Proof */}
          <div className="pt-2 flex items-center gap-4">
            <div className="flex -space-x-2.5 overflow-hidden">
              <img
                className="inline-block h-9 w-9 rounded-full ring-2 ring-[#0a0a0a] object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Customer"
              />
              <img
                className="inline-block h-9 w-9 rounded-full ring-2 ring-[#0a0a0a] object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Customer"
              />
              <img
                className="inline-block h-9 w-9 rounded-full ring-2 ring-[#0a0a0a] object-cover"
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                alt="Customer"
              />
              <img
                className="inline-block h-9 w-9 rounded-full ring-2 ring-[#0a0a0a] object-cover"
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                alt="Customer"
              />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                {'★★★★★'}
              </div>
              <p className="text-xs text-[#a3a3a3]">
                <strong className="text-white font-medium">4.9/5</strong> from 1,400+ verified citations
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Staggered 2-Column Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
          {/* Column 1 */}
          <div className="space-y-5">
            {column1Cards.map((card) => (
              <div
                key={card.id}
                onClick={() => onOpenProof(card.proof)}
                className="gsap-showcase-card group p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Subtle Quote Watermark */}
                <div className="absolute top-5 right-5 text-[#262626] pointer-events-none group-hover:text-[#404040] transition-colors">
                  <Quote className="w-5 h-5 stroke-1 rotate-180" />
                </div>

                <div className="space-y-4">
                  {/* Top Metric Badge */}
                  <div>
                    <span className={card.badgeStyle}>
                      {card.badge}
                    </span>
                  </div>

                  {/* Quote Body */}
                  <p className="font-sans text-xs text-[#a3a3a3] leading-relaxed font-normal">
                    &ldquo;{card.quote}&rdquo;
                  </p>
                </div>

                {/* Author Metadata Footer */}
                <div className="mt-6 pt-4 border-t border-[#262626] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={card.avatarUrl}
                      alt={card.author}
                      className="w-8 h-8 rounded-full object-cover border border-[#262626]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-xs font-medium text-white">
                          {card.author}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                      </div>
                      <p className="font-sans text-[11px] text-[#737373]">{card.role}</p>
                    </div>
                  </div>

                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a3a3a3] hover:text-white">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Column 2: Staggered Offset */}
          <div className="space-y-5 sm:translate-y-8">
            {column2Cards.map((card) => (
              <div
                key={card.id}
                onClick={() => onOpenProof(card.proof)}
                className="gsap-showcase-card group p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Subtle Quote Watermark */}
                <div className="absolute top-5 right-5 text-[#262626] pointer-events-none group-hover:text-[#404040] transition-colors">
                  <Quote className="w-5 h-5 stroke-1 rotate-180" />
                </div>

                <div className="space-y-4">
                  {/* Top Metric Badge */}
                  <div>
                    <span className={card.badgeStyle}>
                      {card.badge}
                    </span>
                  </div>

                  {/* Quote Body */}
                  <p className="font-sans text-xs text-[#a3a3a3] leading-relaxed font-normal">
                    &ldquo;{card.quote}&rdquo;
                  </p>
                </div>

                {/* Author Metadata Footer */}
                <div className="mt-6 pt-4 border-t border-[#262626] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={card.avatarUrl}
                      alt={card.author}
                      className="w-8 h-8 rounded-full object-cover border border-[#262626]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-xs font-medium text-white">
                          {card.author}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                      </div>
                      <p className="font-sans text-[11px] text-[#737373]">{card.role}</p>
                    </div>
                  </div>

                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a3a3a3] hover:text-white">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
