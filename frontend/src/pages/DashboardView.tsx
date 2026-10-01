import { useState, useEffect } from 'react';
import {
  Star,
  FileText,
  Smile,
  Frown,
  Sparkles,
  Send,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from 'lucide-react';
import type { PageId, ReviewItem, MetricShiftItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type WeeklyAnalyticsData, type ReviewItemData } from '../api/businessApi';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
  onAskAiQuery: (query: string) => void;
}

export default function DashboardView({ onNavigate, onAskAiQuery }: DashboardViewProps) {
  const { activeBusiness } = useBusiness();
  const [customQuestion, setCustomQuestion] = useState('');
  const [analytics, setAnalytics] = useState<WeeklyAnalyticsData | null>(null);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    if (!activeBusiness?.id) {
      setAnalytics(null);
      setRecentReviews([]);
      return;
    }

    let isMounted = true;
    const fetchDashboardTelemetry = async () => {
      try {
        const [analyticsData, rawReviews] = await Promise.all([
          businessApi.getWeeklyAnalytics(activeBusiness.id).catch(() => null),
          businessApi.listReviews(activeBusiness.id, 6, 0).catch(() => []),
        ]);

        if (!isMounted) return;

        setAnalytics(analyticsData);

        const mapped: ReviewItem[] = (rawReviews || []).map((r: ReviewItemData) => ({
          id: r.id,
          author: r.author || 'Customer',
          rating: r.rating || 5,
          date: r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Recent',
          platform: (r.platform?.toLowerCase() as any) || 'google',
          content: r.content,
          sentiment: (r.sentiment_label as any) || 'neutral',
          themes: r.themes || [],
        }));
        setRecentReviews(mapped);
      } catch (err) {
        console.warn('Dashboard telemetry fetch notice:', err);
      }
    };

    fetchDashboardTelemetry();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  const handleAsk = (q: string) => {
    onAskAiQuery(q);
    onNavigate('ask-ai');
  };

  const curr = analytics?.currentMetrics;
  const prev = analytics?.previousMetrics;

  const avgRating = curr?.ratingStats?.averageRating ?? 0;
  const prevRating = prev?.ratingStats?.averageRating ?? 0;
  const ratingDelta = prevRating > 0 ? Number((avgRating - prevRating).toFixed(1)) : 0;

  const totalReviews = curr?.totalReviews ?? 0;
  const prevTotal = prev?.totalReviews ?? 0;
  const reviewsChangePercent = prevTotal > 0 ? Math.round(((totalReviews - prevTotal) / prevTotal) * 100) : 0;

  const positivePercent =
    curr?.totalReviews && curr.totalReviews > 0
      ? Math.round(((curr.sentimentDistribution?.positive || 0) / curr.totalReviews) * 100)
      : 0;
  const negativePercent =
    curr?.totalReviews && curr.totalReviews > 0
      ? Math.round(((curr.sentimentDistribution?.negative || 0) / curr.totalReviews) * 100)
      : 0;

  const meaningfulShifts: MetricShiftItem[] = (analytics?.meaningfulChanges || []).map((ch, idx) => ({
    id: `shift_${idx}`,
    title: ch.summary || `${ch.theme} shift`,
    detail: `${ch.metric}: ${ch.previous_value} → ${ch.current_value} (${ch.delta > 0 ? '+' : ''}${ch.delta})`,
    direction: ch.direction === 'down' ? 'down' : 'up',
    color: ch.direction === 'down' ? 'emerald' : 'rose',
  }));

  const themesList = curr?.themes || [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: 4 SUMMARY METRIC CARDS (REAL DATABASE AGGREGATIONS)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Rating */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-amber-400 border border-[#23252a] flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Average Rating</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#62666d] font-medium">/ 5</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8a8f98] font-medium">
              {ratingDelta !== 0 ? (
                <>
                  {ratingDelta > 0 ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={ratingDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {Math.abs(ratingDelta)}
                  </span>
                  <span className="text-[#62666d]">vs prev period</span>
                </>
              ) : (
                <span className="text-[#62666d]">Live customer average</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Total Review Volume */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-[#828fff] border border-[#23252a] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#828fff]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Ingested Reviews</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {totalReviews.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8a8f98] font-medium">
              {reviewsChangePercent !== 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">+{reviewsChangePercent}%</span>
                  <span className="text-[#62666d]">volume velocity</span>
                </>
              ) : (
                <span className="text-[#62666d]">Total across channels</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Positive Sentiment */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-emerald-400 border border-[#23252a] flex items-center justify-center shrink-0">
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Positive Sentiment</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {positivePercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8a8f98] font-medium">
              <span className="text-[#62666d]">
                {curr?.sentimentDistribution?.positive || 0} positive mentions
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Negative Friction */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-rose-400 border border-[#23252a] flex items-center justify-center shrink-0">
            <Frown className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Negative Friction</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {negativePercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8a8f98] font-medium">
              <span className="text-[#62666d]">
                {curr?.sentimentDistribution?.negative || 0} friction reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: NATURAL LANGUAGE ASK-AI COMMAND STRIP
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl p-4 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#f7f8f8]">
          <Sparkles className="w-4 h-4 text-[#828fff]" />
          <span>Ask Grounded AI about {activeBusiness?.name || 'Customer Sentiment'}</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customQuestion.trim()) handleAsk(customQuestion);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder={`e.g. Why did customer rating shift for ${activeBusiness?.name || 'this business'}?`}
            className="flex-1 bg-[#141516] border border-[#23252a] rounded-lg px-3.5 py-2 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="linear-btn-primary text-xs h-9 px-4 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Ask</span>
          </button>
        </form>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: THEMES & WEEK-OVER-WEEK ANOMALIES
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Theme Clusters */}
        <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Top Thematic Clusters</h3>
            <button
              type="button"
              onClick={() => onNavigate('themes')}
              className="text-xs text-[#828fff] hover:text-white transition-colors cursor-pointer"
            >
              View all themes &rarr;
            </button>
          </div>

          {themesList.length === 0 ? (
            <p className="text-xs text-[#8a8f98] py-8 text-center">
              No themes extracted yet. Themes will appear as customer reviews are crawled.
            </p>
          ) : (
            <div className="space-y-3">
              {themesList.slice(0, 5).map((theme) => (
                <div key={theme.theme} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#d0d6e0]">{theme.theme}</span>
                    <span className="text-[#8a8f98] font-mono">{theme.count} mentions</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#18191a] rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.round(((theme.positiveCount || 0) / (theme.count || 1)) * 100)}%`,
                      }}
                      className="bg-emerald-500 h-full"
                    />
                    <div
                      style={{
                        width: `${Math.round(((theme.negativeCount || 0) / (theme.count || 1)) * 100)}%`,
                      }}
                      className="bg-rose-500 h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Meaningful Anomalies / Shifts */}
        <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Detected Telemetry Shifts</h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              Automated Detection
            </span>
          </div>

          {meaningfulShifts.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <AlertCircle className="w-5 h-5 text-[#62666d] mx-auto" />
              <p className="text-xs text-[#8a8f98]">
                No statistical anomalies detected in the current review sample.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {meaningfulShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-3 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-[#f7f8f8] block">{shift.title}</span>
                    <span className="text-[11px] text-[#8a8f98]">{shift.detail}</span>
                  </div>
                  {shift.direction === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 4: RECENT VERIFIED CUSTOMER REVIEWS
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f7f8f8]">Recent Ingested Feedback</h3>
          <button
            type="button"
            onClick={() => onNavigate('reviews')}
            className="text-xs text-[#828fff] hover:text-white transition-colors cursor-pointer"
          >
            View all reviews stream &rarr;
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <p className="text-xs text-[#8a8f98] py-8 text-center">
            No customer reviews have been ingested yet for {activeBusiness?.name || 'this business'}. Connect a channel in Settings to crawl reviews.
          </p>
        ) : (
          <div className="divide-y divide-[#23252a]">
            {recentReviews.slice(0, 4).map((rev) => (
              <div key={rev.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#f7f8f8]">{rev.author}</span>
                    <span className="text-[#62666d]">·</span>
                    <span className="text-amber-400">{'★'.repeat(rev.rating)}</span>
                    <span className="text-[#62666d]">·</span>
                    <span className="capitalize text-[#8a8f98]">{rev.platform}</span>
                  </div>
                  <p className="text-xs text-[#d0d6e0] line-clamp-2">“{rev.content}”</p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 uppercase border ${
                    rev.sentiment === 'positive'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/30'
                      : rev.sentiment === 'negative'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-900/30'
                      : 'bg-amber-950/40 text-amber-300 border-amber-900/30'
                  }`}
                >
                  {rev.sentiment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
