import { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  BarChart2,
  Smile,
  Frown,
  Minus,
  Sparkles,
  AlertTriangle,
  Info,
  Loader2,
  Calendar,
  Layers,
  Heart,
  MessageCircle,
  Users,
} from 'lucide-react';
import {
  instagramApi,
  type InstagramAccount,
  type InstagramAnalytics,
} from '../../api/instagramApi';

interface InstagramAnalyticsModalProps {
  businessId: string;
  account: InstagramAccount;
  onClose: () => void;
}

export default function InstagramAnalyticsModal({
  businessId,
  account,
  onClose,
}: InstagramAnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<InstagramAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [account.id, businessId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await instagramApi.getAnalytics(businessId, account.id);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load Instagram analytics');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0f1011] border border-zinc-800 rounded-2xl max-h-[90vh] flex flex-col text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Instagram Analytics: @{account.username}
                </h3>
                {account.is_verified && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-800/40 font-mono">
                    VERIFIED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Telemetry, derived reach & AI grounded customer sentiment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">Calculating Instagram metrics & AI insights...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : analytics ? (
            <>
              {/* Important Disclaimer Banner */}
              <div className="p-3.5 rounded-xl border border-indigo-900/40 bg-indigo-950/20 text-indigo-200 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="font-semibold text-indigo-300">Methodology distinction: </span>
                  Engagement counts (likes, comments, views) represent digital reach and audience activity,
                  not customer sentiment or product satisfaction. AI sentiment is calculated strictly from
                  verified customer comments and organic feedback.
                </p>
              </div>

              {/* 1. OBSERVED DATA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    1. Observed Data (Direct from Scraper)
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">RAW TELEMETRY</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-400 block mb-1">Posts Ingested</span>
                    <span className="text-base font-bold font-mono text-zinc-100">
                      {analytics.observed_data.total_posts_collected.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-400 block mb-1">Total Likes Recorded</span>
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-base font-bold font-mono text-zinc-100">
                        {analytics.observed_data.total_likes_observed.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-400 block mb-1">Comments Recorded</span>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-base font-bold font-mono text-zinc-100">
                        {analytics.observed_data.total_comments_observed.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-400 block mb-1">Public Followers</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-base font-bold font-mono text-zinc-100">
                        {analytics.observed_data.followers_count != null
                          ? analytics.observed_data.followers_count.toLocaleString()
                          : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DERIVED METRICS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    2. Derived Metrics (Calculated)
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">AGGREGATED</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="text-[11px] text-zinc-400">Avg. Likes / Post</span>
                    <p className="text-lg font-bold font-mono text-zinc-100">
                      {analytics.derived_metrics.avg_likes_per_post}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono">Normalized per post</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="text-[11px] text-zinc-400">Avg. Comments / Post</span>
                    <p className="text-lg font-bold font-mono text-zinc-100">
                      {analytics.derived_metrics.avg_comments_per_post}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono">Conversation activity</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                    <span className="text-[11px] text-zinc-400">Posting Frequency</span>
                    <p className="text-lg font-bold font-mono text-zinc-100">
                      {analytics.derived_metrics.posting_frequency_per_month}{' '}
                      <span className="text-xs font-normal text-zinc-400">posts/mo</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono">Over observed period</span>
                  </div>
                </div>
              </div>

              {/* 3. AI-GENERATED INSIGHTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5e6ad2]" />
                    3. AI-Generated Customer Sentiment & Themes
                  </h4>
                  <span className="text-[10px] font-mono text-[#828cf0]">LLM GROUNDED</span>
                </div>

                {analytics.ai_insights.insufficient_data ? (
                  <div className="p-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950 text-center space-y-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
                    <h5 className="text-xs font-semibold text-zinc-300">
                      Insufficient Customer Comment Volume
                    </h5>
                    <p className="text-[11px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                      {analytics.ai_insights.insufficient_data_reason}
                    </p>
                  </div>
                ) : analytics.ai_insights.sentiment_distribution ? (
                  <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-4">
                    {/* Bar visualization */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Customer Sentiment Distribution</span>
                        <span className="font-mono text-zinc-500 text-[11px]">
                          {analytics.ai_insights.sentiment_distribution.total_analyzed} comments analyzed
                        </span>
                      </div>

                      <div className="h-3 rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800">
                        <div
                          style={{ width: `${analytics.ai_insights.sentiment_distribution.positive}%` }}
                          className="bg-emerald-500 transition-all duration-500"
                          title={`Positive: ${analytics.ai_insights.sentiment_distribution.positive}%`}
                        />
                        <div
                          style={{ width: `${analytics.ai_insights.sentiment_distribution.neutral}%` }}
                          className="bg-zinc-500 transition-all duration-500"
                          title={`Neutral: ${analytics.ai_insights.sentiment_distribution.neutral}%`}
                        />
                        <div
                          style={{ width: `${analytics.ai_insights.sentiment_distribution.negative}%` }}
                          className="bg-rose-500 transition-all duration-500"
                          title={`Negative: ${analytics.ai_insights.sentiment_distribution.negative}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 font-mono">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Smile className="w-3.5 h-3.5" />
                          <span>{analytics.ai_insights.sentiment_distribution.positive}% Positive</span>
                        </span>
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Minus className="w-3.5 h-3.5" />
                          <span>{analytics.ai_insights.sentiment_distribution.neutral}% Neutral</span>
                        </span>
                        <span className="text-rose-400 flex items-center gap-1">
                          <Frown className="w-3.5 h-3.5" />
                          <span>{analytics.ai_insights.sentiment_distribution.negative}% Negative</span>
                        </span>
                      </div>
                    </div>

                    {/* Top Recurring Themes */}
                    {analytics.ai_insights.top_recurring_themes.length > 0 && (
                      <div className="pt-3 border-t border-zinc-800/60">
                        <span className="text-[11px] text-zinc-400 block mb-2 font-medium">
                          Recurring Customer Feedback Themes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {analytics.ai_insights.top_recurring_themes.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-200 flex items-center gap-1.5"
                            >
                              <span>{t.theme}</span>
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded">
                                {t.mentions}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 4. HISTORICAL SNAPSHOTS TIMELINE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    4. Historical Snapshots & Trend Observations
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">AUTHENTIC SNAPSHOTS</span>
                </div>

                {!analytics.has_historical_snapshots ? (
                  <p className="text-xs text-zinc-500 italic p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-center">
                    No historical snapshots recorded yet. Snapshots are recorded upon each synchronization.
                  </p>
                ) : (
                  <div className="border border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-zinc-800/60 bg-zinc-950/60">
                    {analytics.historical_snapshots.map((snap, idx) => (
                      <div
                        key={idx}
                        className="p-3 flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-zinc-400">
                          {new Date(snap.timestamp).toLocaleDateString()}{' '}
                          {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="text-zinc-300">
                            {snap.total_likes.toLocaleString()} likes
                          </span>
                          <span className="text-zinc-300">
                            {snap.total_comments.toLocaleString()} comments
                          </span>
                          {snap.followers != null && (
                            <span className="text-emerald-400">
                              {snap.followers.toLocaleString()} followers
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
