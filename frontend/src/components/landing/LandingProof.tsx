import { ShieldCheck, ExternalLink, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import type { ProofItem } from '../../types';

interface LandingProofProps {
  onOpenProof?: (proof: ProofItem) => void;
}

export default function LandingProof({ onOpenProof }: LandingProofProps) {
  const sampleProof: ProofItem = {
    theme: 'Food Quality (Lukewarm Entrees & Temperature Latency)',
    author: 'Rahul Sharma',
    date: 'Sep 24, 2026',
    rating: 2,
    platform: 'Google Reviews',
    excerpt:
      'The paneer tikka and dal makhani arrived lukewarm. We waited 35 minutes and the food temperature was completely off. Noticeable drop in food quality compared to our previous visits.',
    highlight: 'arrived lukewarm',
    rawId: 'rev_fq_84920b',
  };

  const proofDimensions = [
    {
      label: 'Insight',
      icon: AlertCircle,
      badge: 'Signal Detected',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'Insight',
      description: 'Food quality complaints increased this week.',
      detail: '+267% spike in food temperature & preparation mentions week-over-week.',
    },
    {
      label: 'Evidence',
      icon: FileText,
      badge: 'Raw Grounding',
      badgeColor: 'text-[#828fff] bg-[#5e6ad2]/10 border-[#5e6ad2]/20',
      title: 'Evidence',
      description: 'See the actual reviews, ratings, dates, and source behind the insight.',
      detail: 'Direct foreign-key linkage to raw customer reviews across connected platforms.',
    },
    {
      label: 'Confidence',
      icon: CheckCircle2,
      badge: 'High Reliability',
      badgeColor: 'text-[#4ade80] bg-[#27a644]/10 border-[#27a644]/25',
      title: 'Confidence',
      description: 'Understand how strong the available evidence is.',
      detail: 'Confidence: 94% based on 14 corroborating reviews with p < 0.01 statistical significance.',
    },
    {
      label: 'Limitations',
      icon: ShieldCheck,
      badge: 'Boundary Defined',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Limitations',
      description: "Know when the available data isn't enough to make a reliable conclusion.",
      detail: 'Isolated to Friday/Saturday dinner rush (8–10 PM); weekday lunch dataset remains unaffected.',
    },
  ];

  return (
    <section id="the-proof" className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
            The Proof
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
            Don't just take the AI's word for it.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            Every important insight can be traced back to the customer feedback that supports it.
          </p>
        </div>

        {/* 4 Dimension Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {proofDimensions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-5 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <Icon className="w-4 h-4 text-[#8a8f98]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#f7f8f8] tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#d0d6e0] font-medium leading-snug">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#23252a] text-[11px] text-[#8a8f98] leading-relaxed">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Proof Grounding Panel */}
        <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#23252a]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                <h4 className="text-sm font-semibold text-[#f7f8f8]">
                  Verified Evidence Citation Inspector
                </h4>
              </div>
              <p className="text-xs text-[#8a8f98] mt-0.5">
                Exact review matching the detected insight: Food quality complaints increased this week
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#4ade80] bg-[#27a644]/10 px-2 py-0.5 rounded border border-[#27a644]/25">
                Confidence: High (94%)
              </span>
            </div>
          </div>

          <div className="mt-5 p-5 rounded-xl bg-[#141516] border border-[#23252a] space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#f7f8f8]">{sampleProof.author}</span>
                  <span className="text-xs text-[#62666d]">·</span>
                  <span className="text-xs text-[#8a8f98]">{sampleProof.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191a] border border-[#23252a] text-[#8a8f98]">
                    {sampleProof.platform}
                  </span>
                </div>

                <div className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                  {'★'.repeat(sampleProof.rating)}
                  <span className="text-[#62666d]">({sampleProof.rating}.0)</span>
                </div>
              </div>

              {onOpenProof && (
                <button
                  type="button"
                  onClick={() => onOpenProof(sampleProof)}
                  className="linear-btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Inspect Raw Record</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#8a8f98]" />
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#d0d6e0] leading-relaxed pt-1 font-sans">
              “{sampleProof.excerpt}”
            </p>

            <div className="pt-3 border-t border-[#23252a] flex flex-wrap items-center justify-between text-xs text-[#62666d] gap-2">
              <span className="text-[#8a8f98]">
                Extracted Theme: <strong className="text-[#f7f8f8]">{sampleProof.theme}</strong>
              </span>
              <span className="font-mono text-[11px] text-[#8a8f98]">
                UUID: {sampleProof.rawId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
