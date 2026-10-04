import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Trash2,
  Clock,
  CheckCircle2,
  Building2,
  Star,
  Smile,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type ReportItem } from '../api/businessApi';
import { Select } from '../components/ui/Dropdown';

function cleanSynopsis(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\*\*/g, '').trim();
}

function RealtimeSparkline({
  values = [],
  color = 'emerald',
  direction = 'up',
}: {
  values?: number[];
  color?: 'emerald' | 'rose';
  direction?: 'up' | 'down';
}) {
  const isEmerald = color === 'emerald';
  const stroke = isEmerald ? '#10b981' : '#f43f5e';
  const gradId = `spark_${color}_${Math.random().toString(36).substring(2, 7)}`;

  // Default to a 2-point baseline if values are empty
  const pts = values.length >= 2 ? values : values.length === 1 ? [values[0], values[0]] : [direction === 'up' ? 1 : 2, direction === 'up' ? 2 : 1];
  const minVal = Math.min(...pts);
  const maxVal = Math.max(...pts);
  const range = maxVal - minVal || 1;

  // Coordinate mapping: width=84, height=28, padding=3
  const getX = (i: number) => 3 + (i / Math.max(1, pts.length - 1)) * (84 - 6);
  const getY = (val: number) => 25 - ((val - minVal) / range) * 20;

  const pointsStr = pts.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`);
  const strokePath = `M ${pointsStr.join(' L ')}`;
  const fillPath = `M ${pointsStr[0]} L ${pointsStr.join(' L ')} L ${getX(pts.length - 1).toFixed(1)},28 L ${getX(0).toFixed(1)},28 Z`;

  return (
    <svg className="w-16 sm:w-20 h-8 overflow-visible shrink-0" viewBox="0 0 84 28" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path d={strokePath} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface RealtimeInsight {
  iconType: 'up-right' | 'down-right' | 'up';
  title: string;
  description: string;
  color: 'emerald' | 'rose';
}

function getRealtimeInsights(data?: any): RealtimeInsight[] {
  if (!data) return [];
  const results: RealtimeInsight[] = [];

  // 1. Positive Driver / Strength / Increasing theme
  const topKeyChange = Array.isArray(data.key_changes)
    ? data.key_changes.find((c: any) => c.change_type === 'increasing' || c.change_type === 'new')
    : null;
  const topStrength = Array.isArray(data.strengths) && data.strengths.length > 0 ? data.strengths[0] : null;

  if (topKeyChange) {
    results.push({
      iconType: 'up-right',
      title: topKeyChange.theme,
      description: topKeyChange.description,
      color: 'emerald',
    });
  } else if (topStrength) {
    results.push({
      iconType: 'up-right',
      title: `Strength: ${topStrength.theme}`,
      description: topStrength.description,
      color: 'emerald',
    });
  } else if (Array.isArray(data.themes) && data.themes.length > 0) {
    results.push({
      iconType: 'up-right',
      title: `Primary Theme: ${data.themes[0].name}`,
      description: `Referenced in ${data.themes[0].count} customer review(s) with high positive engagement.`,
      color: 'emerald',
    });
  }

  // 2. Critical Friction / Rating Movement / Area to Improve
  const frictionChange = Array.isArray(data.key_changes)
    ? data.key_changes.find((c: any) => c.change_type === 'decreasing')
    : null;
  const topFriction = Array.isArray(data.areas_to_improve) && data.areas_to_improve.length > 0
    ? data.areas_to_improve[0]
    : null;

  if (frictionChange) {
    results.push({
      iconType: 'down-right',
      title: frictionChange.theme,
      description: frictionChange.description,
      color: 'rose',
    });
  } else if (topFriction) {
    results.push({
      iconType: 'down-right',
      title: `Improvement Priority: ${topFriction.theme}`,
      description: topFriction.description,
      color: 'rose',
    });
  } else if (data.kpis?.rating_delta !== null && data.kpis?.rating_delta !== undefined && data.kpis.rating_delta < 0) {
    results.push({
      iconType: 'down-right',
      title: 'Rating Shift',
      description: `Average rating adjusted by ${data.kpis.rating_delta.toFixed(2)}★ compared to prior baseline period.`,
      color: 'rose',
    });
  } else if (data.sentiment?.negative > 0) {
    results.push({
      iconType: 'down-right',
      title: 'Customer Friction Logged',
      description: `${data.sentiment.negative} negative review(s) detected requiring operational attention.`,
      color: 'rose',
    });
  } else {
    results.push({
      iconType: 'up',
      title: 'Zero Critical Friction',
      description: 'Zero negative reviews or operational complaints recorded during this evaluation window.',
      color: 'emerald',
    });
  }

  // 3. Operational Action / Recommendation / Secondary Strength
  const secondStrength = Array.isArray(data.strengths) && data.strengths.length > 1 ? data.strengths[1] : null;
  const topRec = Array.isArray(data.recommendations) && data.recommendations.length > 0
    ? data.recommendations[0]
    : null;
  const secondChange = Array.isArray(data.key_changes) && data.key_changes.length > 1
    ? data.key_changes[1]
    : null;

  if (secondStrength) {
    results.push({
      iconType: 'up',
      title: secondStrength.theme,
      description: secondStrength.description,
      color: 'emerald',
    });
  } else if (topRec) {
    results.push({
      iconType: 'up',
      title: topRec.title || `Action on ${topRec.related_theme || 'Operations'}`,
      description: topRec.action || topRec.rationale,
      color: 'emerald',
    });
  } else if (secondChange && secondChange !== topKeyChange && secondChange !== frictionChange) {
    results.push({
      iconType: secondChange.change_type === 'decreasing' ? 'down-right' : 'up',
      title: secondChange.theme,
      description: secondChange.description,
      color: secondChange.change_type === 'decreasing' ? 'rose' : 'emerald',
    });
  } else if (Array.isArray(data.themes) && data.themes.length > 1) {
    results.push({
      iconType: 'up',
      title: `Recurring Focus: ${data.themes[1].name}`,
      description: `Discussed across ${data.themes[1].count} patient feedback submission(s).`,
      color: 'emerald',
    });
  }

  return results;
}

function SentimentTrendChart({
  trends = [],
}: {
  trends?: Array<{
    label: string;
    count: number;
    positive: number;
    neutral: number;
    negative: number;
    positivePct?: number | null;
    neutralPct?: number | null;
    negativePct?: number | null;
  }>;
}) {
  if (!trends || trends.length === 0) {
    return (
      <div className="h-[155px] flex items-center justify-center text-xs text-zinc-500 font-mono">
        No review milestones recorded for this period.
      </div>
    );
  }

  const dates = trends.map((t) => t.label);
  const posPoints = trends.map((t) =>
    t.count > 0 ? Math.round((t.positive / t.count) * 100) : (t.positivePct ?? 0)
  );
  const neuPoints = trends.map((t) =>
    t.count > 0 ? Math.round((t.neutral / t.count) * 100) : (t.neutralPct ?? 0)
  );
  const negPoints = trends.map((t) =>
    t.count > 0 ? Math.round((t.negative / t.count) * 100) : (t.negativePct ?? 0)
  );

  const n = trends.length;
  const getX = (idx: number) => 36 + (n > 1 ? idx * ((430 - 36) / (n - 1)) : (430 - 36) / 2);
  const getY = (val: number) => 120 - Math.min(100, Math.max(0, val));

  const makePath = (pts: number[]) =>
    pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt).toFixed(1)}`).join(' ');

  const posPath = makePath(posPoints);
  const neuPath = makePath(neuPoints);
  const negPath = makePath(negPoints);
  const posAreaPath = `${posPath} L ${getX(n - 1).toFixed(1)} 120 L ${getX(0).toFixed(1)} 120 Z`;

  return (
    <div className="space-y-3 pt-1">
      <div className="relative w-full h-[155px]">
        <svg className="w-full h-full" viewBox="0 0 460 145" fill="none">
          <defs>
            <linearGradient id="realtimeSentimentPosGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[100, 75, 50, 25, 0].map((pct) => {
            const y = getY(pct);
            return (
              <g key={pct}>
                <text x="2" y={y + 3} className="fill-zinc-500 font-mono text-[9px]">
                  {pct}%
                </text>
                <line
                  x1="32"
                  y1={y}
                  x2="445"
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 ? undefined : '2 3'}
                />
              </g>
            );
          })}

          {/* Area fill for positive */}
          <path d={posAreaPath} fill="url(#realtimeSentimentPosGrad)" />

          {/* Neutral line & dots */}
          <path d={neuPath} stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
          {neuPoints.map((pt, i) => (
            <circle
              key={`neu-${i}`}
              cx={getX(i)}
              cy={getY(pt)}
              r="3"
              className="fill-zinc-400 stroke-[#09090b]"
              strokeWidth="1.5"
            />
          ))}

          {/* Negative line & dots */}
          <path d={negPath} stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          {negPoints.map((pt, i) => (
            <circle
              key={`neg-${i}`}
              cx={getX(i)}
              cy={getY(pt)}
              r="3"
              className="fill-rose-500 stroke-[#09090b]"
              strokeWidth="1.5"
            />
          ))}

          {/* Positive line & dots */}
          <path d={posPath} stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          {posPoints.map((pt, i) => (
            <circle
              key={`pos-${i}`}
              cx={getX(i)}
              cy={getY(pt)}
              r="3.5"
              className="fill-emerald-400 stroke-[#09090b]"
              strokeWidth="1.5"
            />
          ))}

          {/* X axis date labels */}
          {dates.map((date, i) => (
            <text
              key={`${date}-${i}`}
              x={getX(i)}
              y="138"
              textAnchor="middle"
              className="fill-zinc-500 font-mono text-[9px]"
            >
              {date}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Negative</span>
        </div>
      </div>
    </div>
  );
}

export default function ReportsView() {
  const { businesses, activeBusiness, setActiveBusiness } = useBusiness();

  // Generator form controls
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportTitle, setReportTitle] = useState('');

  // Data & UI states
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [trendTimeframe, setTrendTimeframe] = useState('6w');

  // Sync date ranges when cadence changes
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setEndDate(endStr);

    if (reportType === 'weekly') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().slice(0, 10));
    } else if (reportType === 'monthly') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().slice(0, 10));
    }
  }, [reportType]);

  // Load report history
  const fetchReports = async (selectReportId?: string) => {
    if (!activeBusiness?.id) {
      setReports([]);
      setActiveReport(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await businessApi.listReports(activeBusiness.id, 50, 0);
      setReports(res.reports);

      if (res.reports.length > 0) {
        if (selectReportId) {
          const match = res.reports.find((r) => r.id === selectReportId);
          setActiveReport(match || res.reports[0]);
        } else {
          setActiveReport((prev) => {
            if (!prev) return res.reports[0];
            const stillExists = res.reports.find((r) => r.id === prev.id);
            return stillExists || res.reports[0];
          });
        }
      } else {
        setActiveReport(null);
      }
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to retrieve reports history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeBusiness?.id]);

  // Handle report generation
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id) return;

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        report_type: reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        title: reportTitle.trim() || undefined,
      };

      const newReport = await businessApi.generateReport(activeBusiness.id, payload);
      setSuccessMessage('Intelligence audit synthesized & PDF compiled successfully!');
      setReportTitle('');

      // Refresh list & focus the new report
      await fetchReports(newReport.id);
    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Report generation failed. Please verify reviews are ingested.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle PDF file download
  const handleDownload = async (report: ReportItem) => {
    if (!activeBusiness?.id) return;
    setDownloadingId(report.id);
    try {
      const filename = `${report.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await businessApi.downloadReportPdf(activeBusiness.id, report.id, filename);
    } catch (err: any) {
      console.error('Download error:', err);
      setError('Could not download PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle report deletion
  const handleDelete = async (reportId: string) => {
    if (!activeBusiness?.id) return;
    if (!window.confirm('Delete this intelligence audit permanently?')) return;

    try {
      await businessApi.deleteReport(activeBusiness.id, reportId);
      await fetchReports();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError('Failed to delete report.');
    }
  };

  if (!activeBusiness) {
    return (
      <div className="p-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No Business Selected</h3>
        <p className="text-xs text-zinc-400">
          Select an active business from the header to configure and export intelligence audit reports.
        </p>
      </div>
    );
  }

  const kpis = activeReport?.data?.kpis;
  const sentiment = activeReport?.data?.sentiment;
  const isInsufficient = kpis ? kpis.total_reviews === 0 : false;

  // Realtime trend time-buckets from database aggregation
  const rawTrendBuckets: any[] = activeReport?.data?.trends || [];
  const trendBuckets = useMemo(() => {
    if (!rawTrendBuckets.length) return [];
    if (trendTimeframe === '6w') {
      return rawTrendBuckets.slice(-6);
    }
    if (trendTimeframe === '30d') {
      return rawTrendBuckets.slice(-4);
    }
    return rawTrendBuckets;
  }, [rawTrendBuckets, trendTimeframe]);

  // Dynamic series for sparklines derived from actual historical review buckets
  const reviewVolumeTrends = useMemo(
    () => rawTrendBuckets.map((b: any) => Number(b.count || 0)),
    [rawTrendBuckets]
  );
  const ratingTrends = useMemo(
    () => rawTrendBuckets.map((b: any) => Number(b.average_rating ?? kpis?.average_rating ?? 0)),
    [rawTrendBuckets, kpis?.average_rating]
  );
  const positiveTrends = useMemo(
    () => rawTrendBuckets.map((b: any) => Number(b.positive || 0)),
    [rawTrendBuckets]
  );
  const negativeTrends = useMemo(
    () => rawTrendBuckets.map((b: any) => Number(b.negative || 0)),
    [rawTrendBuckets]
  );

  // Dynamic qualitative insights derived from report AI brief & deterministic metrics
  const realtimeInsights = useMemo(
    () => getRealtimeInsights(activeReport?.data),
    [activeReport?.data]
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* ── 1. Top Header & Business Selector ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-medium">
              Audits & Exports
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
            Executive Intelligence Reports
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Concise reputation audits with one-click formal PDF export.
          </p>
        </div>

        {/* Business Selector Dropdown */}
        <div className="shrink-0 min-w-[200px]">
          <Select
            value={activeBusiness.id}
            onChange={(selectedId) => {
              const matched = businesses.find((b) => b.id === selectedId);
              if (matched) setActiveBusiness(matched);
            }}
            options={businesses.map((biz) => ({
              value: biz.id,
              label: biz.name,
              description: biz.location || undefined,
            }))}
            icon={<Building2 className="w-3.5 h-3.5" />}
            size="sm"
            variant="default"
            className="w-full"
            align="right"
          />
        </div>
      </div>

      {/* ── 2. Compact Generator Bar ─────────────────────────────────── */}
      <div className="bg-zinc-950/70 rounded-xl border border-zinc-800/80 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-3">
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Cadence Pills */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider">
              Cadence Window
            </label>
            <div className="flex rounded-lg bg-zinc-900/80 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setReportType('weekly')}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-all ${
                  reportType === 'weekly'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setReportType('monthly')}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-all ${
                  reportType === 'monthly'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setReportType('custom')}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-all ${
                  reportType === 'custom'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider">
              Reporting Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={reportType !== 'custom'}
                className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-lg border border-zinc-800 px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
              />
              <span className="text-zinc-500 text-xs font-mono">&rarr;</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={reportType !== 'custom'}
                className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-lg border border-zinc-800 px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Optional Title Input */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider">
              Title (Optional)
            </label>
            <input
              type="text"
              placeholder={`${activeBusiness.name} Executive Audit`}
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-lg border border-zinc-800 px-3 py-1.5 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Action Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Audit</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 text-xs font-mono flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              &times;
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* ── 3. Focused Executive Card (Matching User Image Specification) ─ */}
      {isLoading && !activeReport ? (
        <div className="p-16 border border-zinc-800/80 rounded-xl bg-zinc-950/50 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-400">Loading audit metadata...</p>
        </div>
      ) : activeReport ? (
        <div className="bg-[#0b0e14]/90 rounded-2xl border border-zinc-800/80 p-6 sm:p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-6">
          {/* Top Bar: Badges, Title, Subtitle, Download Button */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded uppercase font-semibold tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {activeReport.report_type} Intelligence Audit
                </span>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 ${
                    activeReport.confidence === 'High'
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40'
                      : activeReport.confidence === 'Medium'
                      ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40'
                      : 'bg-rose-950/50 text-rose-400 border border-rose-900/40'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Confidence: {activeReport.confidence} ({Math.round(activeReport.confidence_score * 100)}%)
                </span>
                <button
                  type="button"
                  title="Confidence rating inferred from review telemetry volume and timestamp density"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                  {activeReport.title}
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Period: {activeReport.data?.period_start} &ndash; {activeReport.data?.period_end} &bull; Generated: {activeReport.data?.generated_date}
                </p>
              </div>
            </div>

            {/* DOWNLOAD FULL REPORT (PDF) BUTTON */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(activeReport)}
                disabled={downloadingId === activeReport.id}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {downloadingId === activeReport.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-zinc-950" />
                    <span>Download Full Report (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Insufficient data alert if applicable */}
          {isInsufficient && (
            <div className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-xl flex items-start gap-3 text-amber-300 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Limited Review Telemetry:</strong> Zero reviews recorded in this window. The full PDF contains baseline framework analysis.
              </div>
            </div>
          )}

          {/* Four KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Analyzed Reviews */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <FileText className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                    Analyzed Reviews
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                    {kpis?.total_reviews ?? 0}
                  </div>
                  <div className="text-[11px] font-mono flex items-center gap-0.5">
                    {kpis?.reviews_delta !== null && kpis?.reviews_delta !== undefined ? (
                      kpis.reviews_delta > 0 ? (
                        <>
                          <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400">+{kpis.reviews_delta} vs prior</span>
                        </>
                      ) : kpis.reviews_delta < 0 ? (
                        <>
                          <ArrowDown className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="text-rose-400">{kpis.reviews_delta} vs prior</span>
                        </>
                      ) : (
                        <span className="text-zinc-500">0 vs prior</span>
                      )
                    ) : (
                      <span className="text-zinc-500">First period baseline</span>
                    )}
                  </div>
                </div>
              </div>
              <RealtimeSparkline
                values={reviewVolumeTrends}
                color={(kpis?.reviews_delta ?? 0) < 0 ? 'rose' : 'emerald'}
                direction={(kpis?.reviews_delta ?? 0) < 0 ? 'down' : 'up'}
              />
            </div>

            {/* 2. Average Rating */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <Star className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                    Average Rating
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                    {kpis?.average_rating !== undefined && kpis?.average_rating !== null
                      ? `${kpis.average_rating.toFixed(1)}★`
                      : '—'}
                  </div>
                  <div className="text-[11px] font-mono flex items-center gap-0.5">
                    {kpis?.rating_delta !== null && kpis?.rating_delta !== undefined ? (
                      kpis.rating_delta > 0 ? (
                        <>
                          <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400">+{kpis.rating_delta.toFixed(2)}★ net shift</span>
                        </>
                      ) : kpis.rating_delta < 0 ? (
                        <>
                          <ArrowDown className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="text-rose-400">{kpis.rating_delta.toFixed(2)}★ net shift</span>
                        </>
                      ) : (
                        <span className="text-zinc-500">No rating shift</span>
                      )
                    ) : (
                      <span className="text-zinc-500">First period baseline</span>
                    )}
                  </div>
                </div>
              </div>
              <RealtimeSparkline
                values={ratingTrends}
                color={(kpis?.rating_delta ?? 0) < 0 ? 'rose' : 'emerald'}
                direction={(kpis?.rating_delta ?? 0) < 0 ? 'down' : 'up'}
              />
            </div>

            {/* 3. Positive Sentiment */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <Smile className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                    Positive Sentiment
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
                    {sentiment?.total && sentiment.total > 0
                      ? `${Math.round((sentiment.positive / sentiment.total) * 100)}%`
                      : '—'}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {sentiment?.positive ?? 0} positive mentions
                  </div>
                </div>
              </div>
              <RealtimeSparkline values={positiveTrends} color="emerald" direction="up" />
            </div>

            {/* 4. Critical Friction */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                    Critical Friction
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-rose-400 tracking-tight">
                    {sentiment?.total && sentiment.total > 0
                      ? `${Math.round((sentiment.negative / sentiment.total) * 100)}%`
                      : '0%'}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {sentiment?.negative ?? 0} complaints logged
                  </div>
                </div>
              </div>
              <RealtimeSparkline
                values={negativeTrends}
                color={sentiment?.negative ? 'rose' : 'emerald'}
                direction={sentiment?.negative ? 'down' : 'up'}
              />
            </div>
          </div>

          {/* Executive Briefing Synopsis Box */}
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                Executive Briefing Synopsis
              </span>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                {cleanSynopsis(activeReport.data?.ai_summary)}
              </p>
            </div>
          </div>

          {/* ── Bottom Row: Key Insights & Sentiment Trend (Matching Reference Image) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Key Insights Card */}
            <div className="p-5 sm:p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Lightbulb className="w-4 h-4 text-zinc-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Key Insights</h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(activeReport)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <span>View Full Analysis</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {realtimeInsights.length > 0 ? (
                  realtimeInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          insight.color === 'emerald'
                            ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                            : 'bg-rose-950/60 border border-rose-800/40 text-rose-400'
                        }`}
                      >
                        {insight.iconType === 'up-right' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : insight.iconType === 'down-right' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4
                          className={`text-xs font-semibold leading-snug ${
                            insight.color === 'emerald' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {insight.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500 font-mono py-4 text-center">
                    No qualitative insights logged for this timeframe.
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment Trend Card */}
            <div className="p-5 sm:p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <TrendingUp className="w-4 h-4 text-zinc-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Sentiment Trend</h3>
                </div>

                <Select<string>
                  value={trendTimeframe}
                  onChange={(val) => setTrendTimeframe(val)}
                  options={[
                    { value: '6w', label: 'Last 6 weeks' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: 'all', label: 'All Time' },
                  ]}
                  size="xs"
                  variant="subtle"
                  className="w-36"
                  align="right"
                />
              </div>

              <SentimentTrendChart trends={trendBuckets} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 border border-zinc-800/80 rounded-xl bg-zinc-950/50 text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No Audits Created Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Choose a weekly or monthly window above and click <strong className="text-zinc-200">Generate Audit</strong> to build your first reputation brief.
          </p>
        </div>
      )}

      {/* ── 4. Reports Archive & History List ────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Generated Audits Archive ({reports.length})
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            Click any row to view its executive card or download PDF
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center border border-zinc-800/60 rounded-xl bg-zinc-950/40 text-xs text-zinc-500 font-mono">
            Archive is empty for {activeBusiness.name}.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/70 text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Audit Title</th>
                    <th className="py-2.5 px-4">Cadence</th>
                    <th className="py-2.5 px-4">Date Window</th>
                    <th className="py-2.5 px-4">Volume</th>
                    <th className="py-2.5 px-4">Rating</th>
                    <th className="py-2.5 px-4">Confidence</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reports.map((r) => {
                    const isSelected = activeReport?.id === r.id;
                    const isDownloading = downloadingId === r.id;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setActiveReport(r)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-zinc-900/60' : 'hover:bg-zinc-900/30'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-zinc-200 line-clamp-1">{r.title}</div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Created {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {r.report_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {new Date(r.period_start).toLocaleDateString()} &ndash;{' '}
                          {new Date(r.period_end).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-300">
                          {r.data?.kpis?.total_reviews ?? 0} reviews
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-300">
                          {r.data?.kpis?.average_rating ? `${r.data.kpis.average_rating.toFixed(1)}★` : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                              r.confidence === 'High'
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40'
                                : r.confidence === 'Medium'
                                ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40'
                                : 'bg-rose-950/50 text-rose-400 border border-rose-900/40'
                            }`}
                          >
                            {r.confidence}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Download PDF button */}
                            <button
                              type="button"
                              onClick={() => handleDownload(r)}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-[11px] font-medium transition-all"
                              title="Download PDF"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              <span>PDF</span>
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Delete Report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
