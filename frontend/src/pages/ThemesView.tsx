import { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Loader2,
  Search,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';
import googleIcon from '../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';
import { Select } from '../components/ui/Dropdown';

interface ThemesViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

interface LiveTheme {
  name: string;
  count: number;
  prevalence: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  sentimentRatio: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  const safeRating = Math.max(0, Math.min(max, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safeRating.toFixed(1)} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = i < Math.floor(safeRating);
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

export default function ThemesView({ onOpenProof }: ThemesViewProps) {
  const { activeBusiness } = useBusiness();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search Controls
  const [themeSearch, setThemeSearch] = useState('');
  const [themeSort, setThemeSort] = useState<'mentions' | 'rating' | 'critical'>('mentions');
  const [themeFilterMode, setThemeFilterMode] = useState<'all' | 'critical' | 'praise'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [citationSearch, setCitationSearch] = useState('');
  const [showOverviewGraph, setShowOverviewGraph] = useState(true);

  // Ingest reviews live for theme modeling
  useEffect(() => {
    if (!activeBusiness?.id) {
      setReviews([]);
      setSelectedTheme(null);
      return;
    }

    let isMounted = true;
    const fetchCorpus = async () => {
      setIsLoading(true);
      try {
        const rawReviews = await businessApi.listReviews(activeBusiness.id, 1000, 0);
        if (!isMounted) return;

        const mapped: ReviewItem[] = (rawReviews || []).map((r) => ({
          id: r.id,
          author: r.author || 'Verified Patient',
          rating: Number(r.rating) || 5,
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

        setReviews(mapped);
      } catch (err) {
        console.warn('Failed to load live reviews for theme clustering:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCorpus();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  // Aggregate and extract themes dynamically from live review corpus
  const allThemes = useMemo<LiveTheme[]>(() => {
    if (reviews.length === 0) return [];

    const map = new Map<
      string,
      {
        count: number;
        pos: number;
        neu: number;
        neg: number;
        ratingSum: number;
        ratingCount: number;
      }
    >();

    for (const rev of reviews) {
      const themes = rev.themes || [];
      for (const t of themes) {
        const key = t.trim().toLowerCase();
        if (!key) continue;

        let entry = map.get(key);
        if (!entry) {
          entry = { count: 0, pos: 0, neu: 0, neg: 0, ratingSum: 0, ratingCount: 0 };
          map.set(key, entry);
        }

        entry.count++;
        if (rev.sentiment === 'positive') entry.pos++;
        else if (rev.sentiment === 'negative') entry.neg++;
        else entry.neu++;

        if (rev.rating !== null && rev.rating !== undefined) {
          entry.ratingSum += Number(rev.rating);
          entry.ratingCount++;
        }
      }
    }

    const totalReviewsCount = reviews.length || 1;

    return Array.from(map.entries()).map(([name, data]) => {
      const total = data.count || 1;
      const posPct = Math.round((data.pos / total) * 100);
      const negPct = Math.round((data.neg / total) * 100);
      const neuPct = Math.max(0, 100 - posPct - negPct);

      return {
        name,
        count: data.count,
        prevalence: Math.round((data.count / totalReviewsCount) * 100),
        averageRating: data.ratingCount > 0 ? Number((data.ratingSum / data.ratingCount).toFixed(2)) : 5.0,
        positiveCount: data.pos,
        neutralCount: data.neu,
        negativeCount: data.neg,
        sentimentRatio: {
          positive: posPct,
          neutral: neuPct,
          negative: negPct,
        },
      };
    });
  }, [reviews]);

  // Automatically select first theme if none selected
  useEffect(() => {
    if (!selectedTheme && allThemes.length > 0) {
      setSelectedTheme(allThemes[0].name);
    }
  }, [allThemes, selectedTheme]);

  // Filtered and sorted themes list for Left Pane
  const displayedThemes = useMemo(() => {
    return allThemes
      .filter((t) => {
        // Search filter
        if (themeSearch.trim() && !t.name.toLowerCase().includes(themeSearch.toLowerCase().trim())) {
          return false;
        }
        // Mode filter
        if (themeFilterMode === 'critical') {
          return t.negativeCount > 0;
        }
        if (themeFilterMode === 'praise') {
          return t.sentimentRatio.positive >= 75;
        }
        return true;
      })
      .sort((a, b) => {
        if (themeSort === 'critical') {
          return b.negativeCount - a.negativeCount || a.averageRating - b.averageRating;
        }
        if (themeSort === 'rating') {
          return b.averageRating - a.averageRating;
        }
        return b.count - a.count;
      });
  }, [allThemes, themeSearch, themeFilterMode, themeSort]);

  // Current active theme data
  const currentThemeData = useMemo(() => {
    if (!selectedTheme) return null;
    return allThemes.find((t) => t.name.toLowerCase() === selectedTheme.toLowerCase()) || null;
  }, [selectedTheme, allThemes]);

  // Reviews associated with the currently selected theme
  const themeReviews = useMemo(() => {
    if (!selectedTheme) return [];
    return reviews.filter((r) =>
      (r.themes || []).some((t) => t.trim().toLowerCase() === selectedTheme.toLowerCase())
    );
  }, [selectedTheme, reviews]);

  // Reviews filtered by the selected sentiment switcher & quote search
  const filteredThemeReviews = useMemo(() => {
    return themeReviews.filter((r) => {
      // Sentiment switch filter
      if (sentimentFilter !== 'all' && r.sentiment !== sentimentFilter) {
        return false;
      }
      // Citation search query
      if (citationSearch.trim()) {
        const query = citationSearch.toLowerCase().trim();
        return (
          r.content.toLowerCase().includes(query) ||
          r.author.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [themeReviews, sentimentFilter, citationSearch]);

  // Counts for sentiment tabs
  const positiveThemeReviewsCount = themeReviews.filter((r) => r.sentiment === 'positive').length;
  const neutralThemeReviewsCount = themeReviews.filter((r) => r.sentiment === 'neutral').length;
  const negativeThemeReviewsCount = themeReviews.filter((r) => r.sentiment === 'negative').length;

  // Top themes for Comparison Bar Graph (top 8 themes)
  const topThemesForGraph = useMemo(() => {
    return [...allThemes].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [allThemes]);

  const maxThemeCount = useMemo(() => {
    if (topThemesForGraph.length === 0) return 1;
    return Math.max(...topThemesForGraph.map((t) => t.count), 1);
  }, [topThemesForGraph]);

  // Telemetry Summary Counters
  const criticalThemesCount = allThemes.filter((t) => t.negativeCount > 0).length;
  const praiseThemesCount = allThemes.filter((t) => t.sentimentRatio.positive >= 75).length;

  if (!activeBusiness) {
    return (
      <div className="p-16 max-w-lg mx-auto text-center space-y-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <Tag className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No Business Selected</h3>
        <p className="text-xs text-zinc-400 font-mono">
          Select an active business profile to review semantic themes and customer citations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: TOP HEADER & TELEMETRY SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Semantic Intelligence
            </span>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="text-xs font-mono text-zinc-400">{activeBusiness.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
            Thematic Clusters & Sentiment Matrix
          </h1>
          <p className="text-xs text-zinc-400">
            Interactive breakdown of recurring topics and customer sentiment extracted from verified feedback.
          </p>
        </div>

        {/* Telemetry Stat Badges */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Topics</span>
            <span className="text-sm font-bold font-mono text-zinc-100 tabular-nums">
              {allThemes.length}
            </span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">Praise</span>
            <span className="text-sm font-bold font-mono text-emerald-300 tabular-nums">
              {praiseThemesCount}
            </span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-rose-950/20 border border-rose-900/40 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block">Concerns</span>
            <span className="text-sm font-bold font-mono text-rose-300 tabular-nums">
              {criticalThemesCount}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: INTERACTIVE THEMES COMPARISON BAR GRAPH
          ───────────────────────────────────────────────────────────── */}
      {allThemes.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                Top Thematic Volumes & Sentiment Distribution
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              {/* Graph Legend */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-zinc-400">Positive</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-[11px] text-zinc-400">Neutral</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[11px] text-zinc-400">Negative</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOverviewGraph(!showOverviewGraph)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer underline transition-colors"
              >
                {showOverviewGraph ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {showOverviewGraph && (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] text-zinc-500 font-mono">
                Click any bar below to inspect customer citations and sentiment details:
              </p>
              <div className="grid gap-2.5">
                {topThemesForGraph.map((theme) => {
                  const isSelected = selectedTheme?.toLowerCase() === theme.name.toLowerCase();
                  const barWidthPercent = Math.max(8, (theme.count / maxThemeCount) * 100);

                  return (
                    <div
                      key={theme.name}
                      onClick={() => {
                        setSelectedTheme(theme.name);
                        setSentimentFilter('all');
                      }}
                      className={`group p-2 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-zinc-900/90 border-zinc-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                          : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                      }`}
                    >
                      {/* Theme Name & Rating */}
                      <div className="w-48 shrink-0 flex items-center justify-between pr-2">
                        <span className={`text-xs capitalize font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {theme.name}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                          {theme.averageRating.toFixed(1)}
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        </span>
                      </div>

                      {/* Interactive Horizontal Bar Graph */}
                      <div className="flex-1 h-3 rounded bg-zinc-900 border border-zinc-800/80 overflow-hidden flex relative">
                        <div
                          className="h-full flex transition-all duration-500"
                          style={{ width: `${barWidthPercent}%` }}
                        >
                          {theme.sentimentRatio.positive > 0 && (
                            <div
                              style={{ width: `${theme.sentimentRatio.positive}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`${theme.positiveCount} positive mentions (${theme.sentimentRatio.positive}%)`}
                            />
                          )}
                          {theme.sentimentRatio.neutral > 0 && (
                            <div
                              style={{ width: `${theme.sentimentRatio.neutral}%` }}
                              className="bg-zinc-600 h-full transition-all"
                              title={`${theme.neutralCount} neutral mentions (${theme.sentimentRatio.neutral}%)`}
                            />
                          )}
                          {theme.sentimentRatio.negative > 0 && (
                            <div
                              style={{ width: `${theme.sentimentRatio.negative}%` }}
                              className="bg-rose-500 h-full transition-all"
                              title={`${theme.negativeCount} critical mentions (${theme.sentimentRatio.negative}%)`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Mentions & Proportions */}
                      <div className="w-28 text-right shrink-0 flex items-center justify-end gap-2 font-mono text-[11px]">
                        <span className="text-zinc-200 font-semibold tabular-nums">{theme.count}</span>
                        <span className="text-zinc-500 text-[10px]">mentions</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: MASTER-DETAIL SPLIT WORKSPACE
          ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          <p className="text-xs font-mono text-zinc-400">Synthesizing thematic clusters across reviews...</p>
        </div>
      ) : allThemes.length === 0 ? (
        <div className="p-16 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-center space-y-3 font-mono">
          <Tag className="w-6 h-6 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-100">No Semantic Themes Extracted</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Ingest and analyze customer reviews in Settings to extract topic clusters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN: THEME SELECTOR & FILTERS (5 cols) ─── */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={themeSearch}
                onChange={(e) => setThemeSearch(e.target.value)}
                placeholder="Search topics (e.g., treatment, wait times)..."
                className="w-full bg-zinc-900/70 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans"
              />
            </div>

            {/* Quick Filter Segment Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-900/60 rounded-md border border-zinc-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setThemeFilterMode('all')}
                className={`flex-1 py-1 px-2 rounded transition-colors text-center cursor-pointer ${
                  themeFilterMode === 'all'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({allThemes.length})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilterMode('critical')}
                className={`flex-1 py-1 px-2 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1 ${
                  themeFilterMode === 'critical'
                    ? 'bg-rose-950/50 text-rose-300 font-medium border border-rose-900/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Concerns ({criticalThemesCount})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilterMode('praise')}
                className={`flex-1 py-1 px-2 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1 ${
                  themeFilterMode === 'praise'
                    ? 'bg-emerald-950/50 text-emerald-300 font-medium border border-emerald-900/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Praise ({praiseThemesCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1 pt-0.5">
              <span>Sort topics:</span>
              <Select<'mentions' | 'critical' | 'rating'>
                value={themeSort}
                onChange={(val) => setThemeSort(val)}
                options={[
                  { value: 'mentions', label: 'Volume (Mentions)' },
                  { value: 'critical', label: 'Critical Friction' },
                  { value: 'rating', label: 'Rating' },
                ]}
                size="xs"
                variant="subtle"
                className="w-44"
                align="right"
              />
            </div>

            {/* Scrollable Theme Items List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {displayedThemes.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500">
                  No themes match current search filter.
                </div>
              ) : (
                displayedThemes.map((theme) => {
                  const isSelected = selectedTheme?.toLowerCase() === theme.name.toLowerCase();
                  return (
                    <div
                      key={theme.name}
                      onClick={() => {
                        setSelectedTheme(theme.name);
                        setSentimentFilter('all');
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <h4 className="text-xs font-medium text-zinc-100 capitalize">
                            {theme.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-zinc-400">{theme.count} mentions</span>
                          <span className="text-zinc-600 font-mono">/</span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            {theme.averageRating.toFixed(1)}
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                          </span>
                        </div>
                      </div>

                      {/* Segmented Mini Bar */}
                      <div className="h-1.5 rounded-[2px] bg-zinc-900 overflow-hidden flex">
                        <div
                          style={{ width: `${theme.sentimentRatio.positive}%` }}
                          className="bg-emerald-500/80 h-full"
                          title={`${theme.positiveCount} positive`}
                        />
                        <div
                          style={{ width: `${theme.sentimentRatio.neutral}%` }}
                          className="bg-zinc-600 h-full"
                          title={`${theme.neutralCount} neutral`}
                        />
                        <div
                          style={{ width: `${theme.sentimentRatio.negative}%` }}
                          className="bg-rose-500/80 h-full"
                          title={`${theme.negativeCount} negative`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN: SELECTED THEME DEEP DIVE (7 cols) ─── */}
          <div className="lg:col-span-7 space-y-5">
            {currentThemeData ? (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-5">
                {/* Theme Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        Topic Detail
                      </span>
                      <span className="text-xs font-mono text-zinc-500">
                        {currentThemeData.prevalence}% of feedback corpus
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-100 capitalize">
                      {currentThemeData.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end text-amber-400">
                        <StarRating rating={currentThemeData.averageRating} />
                        <span className="font-mono text-xs font-bold text-zinc-200 ml-1">
                          {currentThemeData.averageRating.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                        {currentThemeData.count} total mentions
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── INTERACTIVE SENTIMENT BAR BREAKDOWN ─── */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Sentiment Breakdown (Click bar to filter citations)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Positive Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('positive')}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        sentimentFilter === 'positive'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.2)]'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-emerald-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                          <ThumbsUp className="w-3 h-3" />
                          Positive
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px]">
                          {currentThemeData.sentimentRatio.positive}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-zinc-100">
                        {currentThemeData.positiveCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.positive}%` }}
                          className="bg-emerald-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Neutral Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('neutral')}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        sentimentFilter === 'neutral'
                          ? 'bg-zinc-900 border-zinc-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-zinc-400">
                          <Minus className="w-3 h-3" />
                          Neutral
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px]">
                          {currentThemeData.sentimentRatio.neutral}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-zinc-100">
                        {currentThemeData.neutralCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.neutral}%` }}
                          className="bg-zinc-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Negative Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('negative')}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        sentimentFilter === 'negative'
                          ? 'bg-rose-950/40 border-rose-500 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.2)]'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-rose-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-rose-400">
                          <ThumbsDown className="w-3 h-3" />
                          Critical
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px]">
                          {currentThemeData.sentimentRatio.negative}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-zinc-100">
                        {currentThemeData.negativeCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.negative}%` }}
                          className="bg-rose-500 h-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── REVIEW SWITCHER TABS (CORE USER REQUIREMENT) ─── */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
                    {/* The 4 Sentiment Switch Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-zinc-900/70 rounded-md border border-zinc-800 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('all')}
                        className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                          sentimentFilter === 'all'
                            ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All ({themeReviews.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('positive')}
                        className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                          sentimentFilter === 'positive'
                            ? 'bg-emerald-950/60 text-emerald-300 font-medium border border-emerald-900/60 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Positive ({positiveThemeReviewsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('neutral')}
                        className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                          sentimentFilter === 'neutral'
                            ? 'bg-zinc-800 text-zinc-200 font-medium border border-zinc-700/60 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        Neutral ({neutralThemeReviewsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('negative')}
                        className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                          sentimentFilter === 'negative'
                            ? 'bg-rose-950/60 text-rose-300 font-medium border border-rose-900/60 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Critical ({negativeThemeReviewsCount})
                      </button>
                    </div>

                    {/* Inline Citation Text Search */}
                    <div className="relative w-full sm:w-44">
                      <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={citationSearch}
                        onChange={(e) => setCitationSearch(e.target.value)}
                        placeholder="Search quote..."
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded pl-7 pr-2.5 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
                      />
                    </div>
                  </div>

                  {/* ─── REVIEW CITATIONS LIST ─── */}
                  <div className="divide-y divide-zinc-800/60 max-h-[460px] overflow-y-auto pr-1">
                    {filteredThemeReviews.length === 0 ? (
                      <div className="py-12 text-center space-y-1.5 font-mono">
                        <CheckCircle2 className="w-5 h-5 text-zinc-600 mx-auto" />
                        <p className="text-xs text-zinc-400 font-medium">
                          No {sentimentFilter !== 'all' ? sentimentFilter : ''} reviews found for this topic.
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          {sentimentFilter === 'negative'
                            ? '100% of reviews for this theme were favorable or neutral.'
                            : 'Adjust your sentiment switch filter or search terms above.'}
                        </p>
                      </div>
                    ) : (
                      filteredThemeReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="py-3.5 space-y-2 group transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-200">{rev.author}</span>
                              <span className="text-zinc-600 font-mono">/</span>
                              <StarRating rating={rev.rating} />
                              <span className="text-zinc-600 font-mono">/</span>
                              <span className="text-[11px] font-mono text-zinc-500">{rev.date}</span>
                              <span className="text-zinc-600 font-mono">/</span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900/60 inline-flex items-center gap-1">
                                <img src={googleIcon} alt="Google" className="w-3 h-3 object-contain shrink-0" />
                                <span>Google</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
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

                              <button
                                type="button"
                                onClick={() => onOpenProof(rev)}
                                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Evidence</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-300 leading-relaxed font-sans pl-2 border-l-2 border-zinc-800 group-hover:border-zinc-600 transition-colors">
                            “{rev.content}”
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 rounded-xl border border-zinc-800/80 bg-zinc-950/70 text-center font-mono text-xs text-zinc-500">
                Select a topic from the left to view customer citations.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
