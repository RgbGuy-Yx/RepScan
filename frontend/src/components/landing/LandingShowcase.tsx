import { useState } from 'react';
import { ArrowUp, ArrowDown, ExternalLink, ShieldCheck, CheckSquare } from 'lucide-react';
import type { ProofItem } from '../../types';

interface LandingShowcaseProps {
  onOpenProof: (proof: ProofItem) => void;
}

export default function LandingShowcase({ onOpenProof }: LandingShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'what-changed' | 'grounding' | 'action-board'>('what-changed');

  const sampleProof: ProofItem = {
    theme: 'Staff Behaviour (Peak-Hour Table Queueing)',
    author: 'Neha Kapoor',
    date: 'Sep 17, 2026',
    rating: 2,
    platform: 'Google Reviews',
    excerpt: 'Waited 45 minutes for a table even with prior reservation. Hostess refused to acknowledge the delay and was dismissive.',
    highlight: 'Waited 45 minutes for a table',
    rawId: 'rev_9a41c28f',
  };

  return (
    <section id="telemetry" className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
              Interactive Telemetry Preview
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8]">
              The product does the heavy lifting.
            </h2>
            <p className="mt-2 text-sm text-[#8a8f98] max-w-xl">
              Inspect how RepScan transforms raw customer opinions into verified operational directives.
            </p>
          </div>

          {/* Linear Pill Tabs (pricing-tab-default vs pricing-tab-selected) */}
          <div className="inline-flex items-center p-1 rounded-full bg-[#0f1011] border border-[#23252a] self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('what-changed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'what-changed'
                  ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              Signal Anomalies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grounding')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'grounding'
                  ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              Proof Grounding
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('action-board')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'action-board'
                  ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              Action Board
            </button>
          </div>
        </div>

        {/* Product Screenshot Panel Card */}
        <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-4 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.06)] min-h-[420px] flex flex-col justify-between">
          {activeTab === 'what-changed' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f7f8f8]">
                    What Changed This Week? (Statistical Anomaly Detection)
                  </h3>
                  <p className="text-xs text-[#8a8f98] mt-0.5">
                    Week-over-week velocity changes exceeding the 2σ variance threshold
                  </p>
                </div>
                <span className="font-mono text-[11px] text-[#4ade80] bg-[#27a644]/10 px-2 py-0.5 rounded border border-[#27a644]/25">
                  CI: 95%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                      <ArrowUp className="w-3.5 h-3.5" /> +267% Spike
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">p=0.003</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">Food Temperature Latency</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed">
                    11 reviews mentioned cold delivery or lukewarm entrees, concentrated during Friday 8–10 PM rushes.
                  </p>
                  <div className="pt-2 text-[11px] text-[#62666d] border-t border-[#23252a]">
                    Root: Heated holding cabinet failure
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                      <ArrowUp className="w-3.5 h-3.5" /> +150% Spike
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">p=0.012</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">Hostess Table Delays</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed">
                    Reserved table hold times exceeded 45 minutes, triggering 8 one-star reviews on Google Places.
                  </p>
                  <div className="pt-2 text-[11px] text-[#62666d] border-t border-[#23252a]">
                    Root: Reservation overbooking
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#4ade80] flex items-center gap-1">
                      <ArrowDown className="w-3.5 h-3.5" /> -86% Decline
                    </span>
                    <span className="text-[10px] text-[#62666d] font-mono">p=0.001</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">Billing Disputes</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed">
                    Complaints regarding unexpected service charges dropped to zero after menu card revisions.
                  </p>
                  <div className="pt-2 text-[11px] text-[#4ade80] border-t border-[#23252a]">
                    Status: Resolved corrective action
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grounding' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f7f8f8]">
                    Grounded Proof Verification Inspector
                  </h3>
                  <p className="text-xs text-[#8a8f98] mt-0.5">
                    Click any citation to verify raw relational database records
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#27a644]/10 text-xs text-[#4ade80] border border-[#27a644]/25">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero Hallucinations Guarantee</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#141516] border border-[#23252a] space-y-3">
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

                  <button
                    type="button"
                    onClick={() => onOpenProof(sampleProof)}
                    className="linear-btn-secondary text-xs h-8 px-3 flex items-center gap-1.5"
                  >
                    <span>Inspect Raw Record</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8a8f98]" />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-[#d0d6e0] leading-relaxed pt-1 font-sans">
                  “{sampleProof.excerpt}”
                </p>

                <div className="pt-2.5 border-t border-[#23252a] flex flex-wrap items-center justify-between text-xs text-[#62666d]">
                  <span className="text-[#8a8f98]">Extracted Classification: <strong>{sampleProof.theme}</strong></span>
                  <span className="font-mono text-[11px] text-[#8a8f98]">Source UUID: {sampleProof.rawId}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'action-board' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f7f8f8]">
                    Operational Action Board
                  </h3>
                  <p className="text-xs text-[#8a8f98] mt-0.5">
                    Assign corrective tasks with automated SLA tracking
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-[#141516] border border-[#23252a] text-[#d0d6e0] flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-[#5e6ad2]" />
                  <span>3 Active Actions</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-1.5 py-0.5 rounded font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px]">
                      HIGH PRIORITY
                    </span>
                    <span className="text-[#62666d]">Open</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">Recalibrate Kitchen Holding Units</h4>
                  <p className="text-[11.5px] text-[#8a8f98]">Assignee: Head Chef Arvind</p>
                  <div className="text-[10px] text-[#62666d] pt-1 border-t border-[#23252a]">
                    Linked: #Food Quality
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-1.5 py-0.5 rounded font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px]">
                      MEDIUM PRIORITY
                    </span>
                    <span className="text-amber-400">In Progress</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">Hostess Reservation Buffer Policy</h4>
                  <p className="text-[11.5px] text-[#8a8f98]">Assignee: Manager Rohit</p>
                  <div className="text-[10px] text-[#62666d] pt-1 border-t border-[#23252a]">
                    Linked: #Staff Behaviour
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-1.5 py-0.5 rounded font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px]">
                      RESOLVED
                    </span>
                    <span className="text-[#4ade80]">Done ✓</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">Update Printed Menu Pricing</h4>
                  <p className="text-[11.5px] text-[#8a8f98]">Assignee: Operations Lead</p>
                  <div className="text-[10px] text-[#4ade80] pt-1 border-t border-[#23252a]">
                    Result: 0 billing disputes
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Card Footer */}
          <div className="pt-4 mt-6 border-t border-[#23252a] flex items-center justify-between text-xs text-[#8a8f98]">
            <span>Active Dataset: 248 verified customer reviews from Google, Instagram, and LinkedIn</span>
            <span className="font-mono text-[11px] text-[#62666d]">Deterministic PostgreSQL Engine</span>
          </div>
        </div>
      </div>
    </section>
  );
}
