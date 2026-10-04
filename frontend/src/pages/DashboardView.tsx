import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Building2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import type { PageId, ReviewItem, MetricShiftItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type WeeklyAnalyticsData, type ReviewItemData } from '../api/businessApi';
import ReviewTrendChart from '../components/dashboard/ReviewTrendChart';
import RatingDistributionChart from '../components/dashboard/RatingDistributionChart';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import googleIcon from '../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
  onAskAiQuery: (query: string) => void;
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = i < Math.floor(rating);
        return (
          <svg
            key={i}
            className={`w-3 h-3 ${fill ? 'text-amber-400 fill-amber-400' : 'text-zinc-700 fill-transparent'}`}
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth={fill ? 0 : 1.5}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function DashboardView({ onNavigate, onAskAiQuery }: DashboardViewProps) {
  const { activeBusiness, businesses, setActiveBusiness, isLoading: isBusinessLoading } = useBusiness();
  const [customQuestion, setCustomQuestion] = useState('');
  const [analytics, setAnalytics] = useState<WeeklyAnalyticsData | null>(null);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness?.id) {
      setAnalytics(null);
      setRecentReviews([]);
      return;
    }

    let isMounted = true;
    const fetchDashboardTelemetry = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, rawReviews] = await Promise.all([
          businessApi.getWeeklyAnalytics(activeBusiness.id).catch(() => null),
          businessApi.listReviews(activeBusiness.id, 1000, 0).catch(() => []),
        ]);

        if (!isMounted) return;

        setAnalytics(analyticsData);

        const mapped: ReviewItem[] = (rawReviews || []).map((r: ReviewItemData) => ({
          id: r.id,
          author: r.author || 'Verified Patient',
          rating: Number(r.rating) || 5,
          publishedAt: r.published_at || undefined,
          date: r.published_at
            ? new Date(r.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          platform: (String(r.platform || 'google').toLowerCase() as any),
          content: r.content || '',
          sentiment: (r.sentiment_label as any) || 'neutral',
          themes: Array.isArray(r.themes) ? r.themes : [],
        }));
        setRecentReviews(mapped);
      } catch (err) {
        console.warn('Dashboard telemetry fetch notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardTelemetry();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  const handleAsk = (q: string) => {
    if (!q.trim()) return;
    onAskAiQuery(q.trim());
    onNavigate('ask-ai');
  };

  const curr = analytics?.currentMetrics || (analytics as any)?.current_week;
  const prev = analytics?.previousMetrics || (analytics as any)?.previous_week;

  const totalReviews = (curr?.totalReviews && curr.totalReviews > 0)
    ? curr.totalReviews
    : recentReviews.length;

  const avgRating = curr?.ratingStats?.averageRating ?? (
    recentReviews.length > 0
      ? Number((recentReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / recentReviews.length).toFixed(2))
      : 0
  );

  const prevRating = prev?.ratingStats?.averageRating ?? 0;
  const ratingDelta = prevRating > 0 ? Number((avgRating - prevRating).toFixed(2)) : 0;

  const prevTotal = prev?.totalReviews ?? 0;
  const reviewsChangePercent =
    prevTotal > 0 ? Math.round(((totalReviews - prevTotal) / prevTotal) * 100) : 0;

  const positivePercent =
    curr?.totalReviews && curr.totalReviews > 0
      ? Math.round(((curr.sentimentDistribution?.positive || 0) / curr.totalReviews) * 100)
      : recentReviews.length > 0
      ? Math.round((recentReviews.filter((r) => r.sentiment === 'positive').length / recentReviews.length) * 100)
      : 0;

  const negativePercent =
    curr?.totalReviews && curr.totalReviews > 0
      ? Math.round(((curr.sentimentDistribution?.negative || 0) / curr.totalReviews) * 100)
      : recentReviews.length > 0
      ? Math.round((recentReviews.filter((r) => r.sentiment === 'negative').length / recentReviews.length) * 100)
      : 0;

  const meaningfulShifts: MetricShiftItem[] = (
    analytics?.meaningfulChanges || (analytics as any)?.meaningful_changes || []
  ).map((ch: any, idx: number) => ({
    id: `shift_${idx}`,
    title: ch.summary || `${ch.theme} shift`,
    detail: `${ch.metric}: ${ch.previous_value} to ${ch.current_value} (${ch.delta > 0 ? '+' : ''}${ch.delta})`,
    direction: ch.direction === 'down' ? 'down' : 'up',
    color: ch.direction === 'down' ? 'emerald' : 'rose',
  }));

  const themesList = (curr?.themes && curr.themes.length > 0)
    ? curr.themes
    : Array.from(new Set(recentReviews.flatMap((r) => r.themes || []))).slice(0, 6).map((theme) => {
        const matching = recentReviews.filter((r) => (r.themes || []).includes(theme));
        return {
          theme,
          count: matching.length,
          prevalence: Math.round((matching.length / (recentReviews.length || 1)) * 100),
          negativeCount: matching.filter((r) => r.sentiment === 'negative').length,
          positiveCount: matching.filter((r) => r.sentiment === 'positive').length,
          neutralCount: matching.filter((r) => r.sentiment === 'neutral').length,
          averageRating: matching.length > 0
            ? Number((matching.reduce((s, r) => s + (Number(r.rating) || 0), 0) / matching.length).toFixed(1))
            : 5.0,
          evidenceSnippets: matching.slice(0, 2).map((r) => r.content),
        };
      });

  if (isBusinessLoading) {
    return <DashboardSkeleton />;
  }

  if (!activeBusiness) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-6">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
              Select a Workspace Business
            </h2>
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              Choose an active business profile to review telemetry, analyze sentiment patterns, and query customer feedback.
            </p>
          </div>

          {businesses.length > 0 ? (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                Available Profiles:
              </span>
              <div className="grid gap-2">
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => setActiveBusiness(biz)}
                    className="w-full p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80 text-left flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-white block">
                        {biz.name}
                      </span>
                      {biz.location && (
                        <span className="text-[11px] font-mono text-zinc-500 mt-0.5 block">{biz.location}</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors">Select &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configure Business Listing in Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Zero reviews helper notice */}
      {totalReviews === 0 && (
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-medium text-zinc-200">
              No reviews indexed yet for {activeBusiness.name}
            </span>
            <p className="text-zinc-500 text-[11px] flex items-center gap-1.5 flex-wrap">
              <span>Connect your</span>
              <span className="inline-flex items-center gap-1 font-medium text-zinc-300">
                <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                <span>Google Maps</span>
              </span>
              <span>listing or trigger a scrape in Settings to begin sentiment processing.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: REFINED TELEMETRY GRID (4 METRICS)
          ───────────────────────────────────────────────────────────── */}
      <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
        {/* Metric 1: Average Rating */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Average Rating</span>
            <div className="text-amber-400">
              <StarRating rating={avgRating} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight font-mono">
              {avgRating > 0 ? avgRating.toFixed(2) : '0.00'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {ratingDelta !== 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 ${
                  ratingDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {ratingDelta > 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {ratingDelta > 0 ? `+${ratingDelta}` : `${ratingDelta}`}
                <span className="text-zinc-500 ml-1">vs prior cycle</span>
              </span>
            ) : (
              <span className="text-zinc-500">Benchmark across sample</span>
            )}
          </div>
        </div>

        {/* Metric 2: Total Reviews Ingested */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total Feedback</span>
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight font-mono">
              {totalReviews.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-mono">records</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
            {reviewsChangePercent !== 0 ? (
              <span className="text-emerald-400 inline-flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                +{reviewsChangePercent}% velocity
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain shrink-0" />
                <span>Synced from verified Google listings</span>
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Positive Sentiment */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Positive Sentiment</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight font-mono">
              {positivePercent}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">favorable</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
            <span>{curr?.sentimentDistribution?.positive ?? 0} positive mentions</span>
          </div>
        </div>

        {/* Metric 4: Critical / Negative Friction */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Critical Feedback</span>
            <div className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight font-mono">
              {negativePercent}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">concerns</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
            <span>{curr?.sentimentDistribution?.negative ?? 0} friction reports</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: COMMAND QUERY STRIP (MINIMAL SEARCH INTERFACE)
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(customQuestion);
          }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={`Query feedback for ${activeBusiness.name} (e.g., patient satisfaction, treatment results, wait times)...`}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-all active:scale-[0.98] shrink-0 cursor-pointer"
          >
            Ask Assistant
          </button>
        </form>

        {/* Quick high-signal prompts */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-zinc-400">
          <span className="text-zinc-600 uppercase text-[10px] shrink-0">Sample Queries:</span>
          {[
            'Overall patient treatment feedback',
            'Wait times during consultation hours',
            'Medication side-effects and concerns',
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleAsk(promptText)}
              className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2.5: REVIEW TREND & RATING DISTRIBUTION
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8">
          <ReviewTrendChart reviews={recentReviews} className="h-full" />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <RatingDistributionChart
            distribution={curr?.ratingStats?.distribution}
            reviews={recentReviews}
            totalReviews={totalReviews}
            className="h-full"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: THEMES & DETECTED TELEMETRY SHIFTS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Topic Clusters */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Thematic Clusters</h3>
              <p className="text-[11px] text-zinc-500">Top topic occurrences across analyzed reviews</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('themes')}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {themesList.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center font-mono">
              No cluster themes detected yet.
            </p>
          ) : (
            <div className="space-y-3.5">
              {themesList.slice(0, 5).map((theme: any) => {
                const total = theme.count || 1;
                const posPct = Math.round(((theme.positiveCount || 0) / total) * 100);
                const negPct = Math.round(((theme.negativeCount || 0) / total) * 100);
                const neuPct = 100 - posPct - negPct;

                return (
                  <div key={theme.theme} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200 capitalize">{theme.theme}</span>
                      <span className="text-zinc-500 font-mono text-[11px]">{theme.count} mentions</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-[2px] overflow-hidden flex">
                      <div style={{ width: `${posPct}%` }} className="bg-emerald-500/80 h-full" />
                      <div style={{ width: `${neuPct}%` }} className="bg-zinc-700 h-full" />
                      <div style={{ width: `${negPct}%` }} className="bg-rose-500/80 h-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Meaningful Anomalies / Shifts */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Telemetry Shifts</h3>
              <p className="text-[11px] text-zinc-500">Statistically significant changes between crawl windows</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Weekly brief</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {meaningfulShifts.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <CheckCircle2 className="w-4 h-4 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500 font-mono">
                No statistical anomalies detected in the current window.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {meaningfulShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-zinc-200 block">{shift.title}</span>
                    <span className="text-[11px] font-mono text-zinc-500">{shift.detail}</span>
                  </div>
                  {shift.direction === 'up' ? (
                    <span className="text-rose-400 p-1 rounded bg-rose-500/10 shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-emerald-400 p-1 rounded bg-emerald-500/10 shrink-0">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: RECENT VERIFIED REVIEWS STREAM
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Ingested Feedback Stream</h3>
            <p className="text-[11px] text-zinc-500">Live normalized customer feedback entries</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reviews')}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>All reviews</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <p className="text-xs text-zinc-500 py-8 text-center font-mono">
            No customer reviews have been ingested yet.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentReviews.slice(0, 6).map((rev) => (
              <div key={rev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 group">
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-zinc-200">{rev.author}</span>
                    <span className="text-zinc-600 font-mono">/</span>
                    <StarRating rating={rev.rating} />
                    <span className="text-zinc-600 font-mono">/</span>
                    <span className="text-[11px] font-mono text-zinc-500">{rev.date}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900/60 inline-flex items-center gap-1.5">
                      {String(rev.platform).toLowerCase().includes('google') ? (
                        <>
                          <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain shrink-0" />
                          <span>Google</span>
                        </>
                      ) : (
                        <span>{rev.platform}</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{rev.content}</p>
                </div>
                <div className="flex items-center gap-2 self-start shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
                      rev.sentiment === 'positive'
                        ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40'
                        : rev.sentiment === 'negative'
                        ? 'bg-rose-950/30 text-rose-300 border-rose-900/40'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        rev.sentiment === 'positive'
                          ? 'bg-emerald-400'
                          : rev.sentiment === 'negative'
                          ? 'bg-rose-400'
                          : 'bg-zinc-500'
                      }`}
                    />
                    <span className="capitalize">{rev.sentiment}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
