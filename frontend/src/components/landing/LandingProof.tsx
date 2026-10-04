import { ShieldCheck, ExternalLink, AlertCircle, FileText, CheckCircle2, Star } from 'lucide-react';
import type { ProofItem } from '../../types';
import googleIcon from '../../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

interface LandingProofProps {
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingProof({ onOpenProof }: LandingProofProps) {
  const sampleProof: ProofItem = {
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

  const proofDimensions = [
    {
      label: 'Insight',
      icon: AlertCircle,
      badge: 'Signal Detected',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'Insight',
      description: 'Consultation wait times spiked this week.',
      detail: '+24% increase in appointment queue latency mentions cycle-over-cycle.',
    },
    {
      icon: FileText,
      label: 'Evidence',
      badge: 'Raw Grounding',
      badgeColor: 'text-zinc-300 bg-zinc-900 border-zinc-700',
      title: 'Evidence',
      description: 'See the actual reviews, ratings, dates, and source behind the insight.',
      detail: 'Direct cryptographic linkage to verified raw customer reviews across connected platforms.',
    },
    {
      icon: CheckCircle2,
      label: 'Confidence',
      badge: 'High Reliability',
      badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
      title: 'Confidence',
      description: 'Understand the mathematical weight of the corroborating evidence.',
      detail: 'Confidence: 94% based on 14 corroborating reviews with p < 0.01 statistical significance.',
    },
    {
      icon: ShieldCheck,
      label: 'Boundaries',
      badge: 'Boundary Defined',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Boundaries',
      description: 'Know when available data is limited to specific operational cohorts.',
      detail: 'Isolated to peak evening consultation hours (6 - 8 PM); morning slots remain unaffected.',
    },
  ];

  return (
    <section id="the-proof" className="py-24 border-t border-zinc-800/80 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-2xl space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
            Verification Protocol
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-100">
            Don't just take an AI's word for it.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
            Every analytical conclusion is grounded in verifiable evidence. Zero black-box summarization, zero synthetic fabrications.
          </p>
        </div>

        {/* 4 Dimension Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {proofDimensions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <Icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-300 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/70 text-[11px] font-mono text-zinc-500 leading-relaxed">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Proof Grounding Panel */}
        <div className="rounded-xl bg-zinc-950/90 border border-zinc-800/80 p-6 sm:p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h4 className="text-sm font-semibold text-zinc-100">
                  Verified Evidence Citation Inspector
                </h4>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Exact review corroborating detected shift: Consultation wait times spiked this week
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40">
                Confidence: High (94%)
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="font-medium text-zinc-200">{sampleProof.author}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-500 text-[11px]">{sampleProof.date}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 inline-flex items-center gap-1">
                  <img src={googleIcon} alt="Google" className="w-3 h-3 object-contain shrink-0" />
                  <span>Google</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < sampleProof.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
                    />
                  ))}
                  <span className="text-zinc-500 font-mono text-[11px] ml-1">({sampleProof.rating}.0)</span>
                </div>

                {onOpenProof && (
                  <button
                    type="button"
                    onClick={() => onOpenProof(sampleProof)}
                    className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono transition-colors inline-flex items-center gap-1.5 cursor-pointer ml-2"
                  >
                    <span>Inspect Raw Record</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans pl-2.5 border-l-2 border-rose-500/80">
              "{sampleProof.excerpt}"
            </p>

            <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-500 gap-2">
              <span>
                Theme Cluster: <strong className="text-zinc-200 font-normal">{sampleProof.theme}</strong>
              </span>
              <span>
                UUID: {sampleProof.rawId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
