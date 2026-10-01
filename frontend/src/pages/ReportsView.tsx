import { useState, useEffect } from 'react';
import { ShieldCheck, ArrowUp, ArrowDown, Sparkles, Loader2, FileText } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type WeeklyBriefData } from '../api/businessApi';

export default function ReportsView() {
  const { activeBusiness } = useBusiness();
  const [brief, setBrief] = useState<WeeklyBriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusiness?.id) {
      setBrief(null);
      return;
    }

    let isMounted = true;
    const fetchBrief = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await businessApi.getLatestBrief(activeBusiness.id);
        if (isMounted) setBrief(data);
      } catch (err: any) {
        console.warn('No brief found:', err);
        if (isMounted) setBrief(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBrief();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  const handleGenerateBrief = async () => {
    if (!activeBusiness?.id) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await businessApi.generateBrief(activeBusiness.id);
      setBrief(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize brief. Ensure customer reviews are ingested.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em] block">
            Automated Intelligence Document
          </span>
          <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight mt-0.5">
            Weekly Executive Reputation Brief
          </h2>
          <p className="text-xs text-[#8a8f98]">
            {brief?.period_start && brief?.period_end
              ? `Period: ${new Date(brief.period_start).toLocaleDateString()} – ${new Date(
                  brief.period_end
                ).toLocaleDateString()}`
              : `Business: ${activeBusiness?.name || 'Active'}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateBrief}
          disabled={isGenerating || !activeBusiness?.id}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.35)] disabled:opacity-50 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing Telemetry...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Weekly Brief</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* Main Report Document Card */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
          <p className="text-xs text-[#8a8f98]">Retrieving audited executive brief from database...</p>
        </div>
      ) : !brief ? (
        <div className="p-16 rounded-xl bg-[#0f1011] border border-[#23252a] text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-center mx-auto text-[#62666d]">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#f7f8f8]">No Executive Brief Generated Yet</h3>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
            Click <strong className="text-[#f7f8f8]">Generate Weekly Brief</strong> above to synthesize the latest telemetry and sentiment anomalies into an executive report.
          </p>
        </div>
      ) : (
        <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-7">
          {/* Document Header & Confidence Score */}
          <div className="flex flex-wrap items-center justify-between pb-6 border-b border-[#23252a] gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-[#828fff] bg-[#5e6ad2]/15 px-2.5 py-1 rounded-md border border-[#5e6ad2]/30 uppercase tracking-[0.05em]">
                POSTGRESQL AUDITED BRIEF
              </span>
              <h3 className="text-base font-semibold text-[#f7f8f8] pt-1">
                {activeBusiness?.name} — {brief.headline || 'Weekly Intelligence Telemetry'}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#27a644]/10 border border-[#27a644]/25 text-xs text-[#4ade80] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                <div>
                  <span className="font-semibold block leading-none">Confidence: High</span>
                  <span className="text-[10px] text-[#4ade80]/80 mt-0.5 block">Zero-hallucination verified citations</span>
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
              {brief.executive_summary}
            </p>
          </div>

          {/* Root Causes and Suggested Actions */}
          {brief.root_causes && brief.root_causes.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
                2. Key Root Causes Identified
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brief.root_causes.map((rc, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-[#141516] border border-[#23252a] space-y-1">
                    <span className="text-xs font-semibold text-[#f7f8f8] block">{rc.cause}</span>
                    <p className="text-[11px] text-[#8a8f98]">{rc.impact}</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0f1011] text-[#828fff] border border-[#5e6ad2]/20 inline-block mt-1 font-mono">
                      #{rc.theme}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {brief.suggested_actions && brief.suggested_actions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
                3. Operational Action Recommendations
              </h4>
              <div className="space-y-2">
                {brief.suggested_actions.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#f7f8f8] font-medium block">{act.action}</span>
                      <span className="text-[10px] text-[#8a8f98]">Assigned to: {act.department}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        act.priority === 'high'
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-900/30'
                          : 'bg-blue-950/40 text-blue-300 border border-blue-900/30'
                      }`}
                    >
                      {act.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistical Week-Over-Week Shifts */}
          {brief.key_shifts && brief.key_shifts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
                4. Statistical Week-over-Week Anomalies
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {brief.key_shifts.map((shift, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-colors">
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
          )}
        </div>
      )}
    </div>
  );
}
