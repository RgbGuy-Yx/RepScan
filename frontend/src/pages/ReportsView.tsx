import { Download, ShieldCheck, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { MOCK_BUSINESS, MOCK_SHIFTS } from '../mock/dashboardData';

export default function ReportsView() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em] block">
            Automated Intelligence Document
          </span>
          <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight mt-0.5">
            Weekly Executive Reputation Brief
          </h2>
          <p className="text-xs text-[#8a8f98]">Period: {MOCK_BUSINESS.currentPeriod}</p>
        </div>

        <button
          type="button"
          onClick={() => alert('Exporting Executive Report PDF…')}
          className="linear-btn-primary text-xs h-9 px-4 flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Executive PDF</span>
        </button>
      </div>

      {/* Main Report Document Card */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-7">
        {/* Document Header & Confidence Score */}
        <div className="flex flex-wrap items-center justify-between pb-6 border-b border-[#23252a] gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-[#828fff] bg-[#5e6ad2]/15 px-2.5 py-1 rounded-md border border-[#5e6ad2]/30 uppercase tracking-[0.05em]">
              AUDITED INTELLIGENCE BRIEF
            </span>
            <h3 className="text-base font-semibold text-[#f7f8f8] pt-1">
              {MOCK_BUSINESS.name} — Performance Telemetry
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#27a644]/10 border border-[#27a644]/25 text-xs text-[#4ade80] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#27a644]" />
              <div>
                <span className="font-semibold block leading-none">Confidence: High (92%)</span>
                <span className="text-[10px] text-[#4ade80]/80 mt-0.5 block">248 reviews analyzed · 0 data gaps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary Narrative */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
            1. Executive Summary
          </h4>
          <p className="text-xs sm:text-sm text-[#d0d6e0] leading-relaxed bg-[#141516] p-4 rounded-lg border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            During the week of September 15–21, 2026, <strong className="text-[#f7f8f8]">The Urban Table</strong> recorded <strong className="text-[#f7f8f8]">248 customer reviews</strong> across Google, Instagram, and LinkedIn (a <strong className="text-[#f7f8f8]">28% volume increase</strong>). Overall customer sentiment remained majority positive at <strong className="text-[#4ade80]">62%</strong>; however, the average rating dipped from <strong className="text-[#f7f8f8]">4.5 to 4.1 stars</strong>. This variance was primarily driven by cold food delivery and table wait times during peak dinner rushes, while customer perception of Ambience and Interior Aesthetics remained exceptionally high.
          </p>
        </div>

        {/* Top Praises vs Complaints Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Praises */}
          <div className="p-5 rounded-xl bg-[#141516] border border-[#27a644]/25 space-y-3">
            <div className="flex items-center gap-2 text-[#4ade80] font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#27a644]" />
              <span>Top Operational Praises</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d0d6e0]">
              <li className="p-3 rounded-lg bg-[#0f1011] border border-[#23252a]">
                <strong className="text-[#f7f8f8] block">Ambience &amp; Seating Design</strong>
                <span className="text-[#8a8f98] text-[11.5px] mt-0.5 block">
                  “Amazing ambience and great food! Loved the service as well.” (Priya S.)
                </span>
              </li>
              <li className="p-3 rounded-lg bg-[#0f1011] border border-[#23252a]">
                <strong className="text-[#f7f8f8] block">Corporate Event Hospitality</strong>
                <span className="text-[#8a8f98] text-[11.5px] mt-0.5 block">
                  “Flawless arrangements and exquisite culinary presentation.” (Vikram C.)
                </span>
              </li>
            </ul>
          </div>

          {/* Complaints */}
          <div className="p-5 rounded-xl bg-[#141516] border border-rose-500/25 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-medium text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Critical Friction Points</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d0d6e0]">
              <li className="p-3 rounded-lg bg-[#0f1011] border border-[#23252a]">
                <strong className="text-[#f7f8f8] block">Kitchen Hot-Holding Latency</strong>
                <span className="text-[#8a8f98] text-[11.5px] mt-0.5 block">
                  “Food was cold and the staff was not responsive.” (Rahul M.)
                </span>
              </li>
              <li className="p-3 rounded-lg bg-[#0f1011] border border-[#23252a]">
                <strong className="text-[#f7f8f8] block">Peak-Hour Table Queueing</strong>
                <span className="text-[#8a8f98] text-[11.5px] mt-0.5 block">
                  “Waited 45 minutes for a table even with prior reservation.” (Neha K.)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Statistical Week-Over-Week Anomalies */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
            2. Statistical Week-over-Week Anomalies
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MOCK_SHIFTS.map((shift) => (
              <div key={shift.id} className="p-4 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-[#f7f8f8]">
                  {shift.direction === 'up' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-[#4ade80]" />
                  )}
                  <span>{shift.title}</span>
                </div>
                <p className="text-xs text-[#8a8f98] mt-1 leading-snug">{shift.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
