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
import { Select } from '../components/ui/Dropdown';

interface ThemesViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

interface LiveTheme {
  name: string;
  count: number;
  prevalence: number;
  averageRating: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  sentimentRatio: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

function StarRating({ rating, max = 5 }: { rating: number | string | null | undefined; max?: number }) {
  if (rating === null || rating === undefined) return null;
  const num = Number(rating);
  if (isNaN(num) || num <= 0) return null;
  const safeRating = Math.max(0, Math.min(max, num));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safeRating.toFixed(1)} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = i < Math.floor(safeRating);
        return (
          <svg
            key={i}
            className={`w-3 h-3 ${fill ? 'text-amber-400 fill-amber-400' : 'text-neutral-700 fill-transparent'}`}
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

        const mapped: ReviewItem[] = (rawReviews || []).map((r) => {
          const isIg = String(r.platform || '').toLowerCase().includes('instagram');
          return {
            id: r.id,
            author: r.author || (isIg ? 'Instagram User' : 'Verified Patient'),
            rating: isIg ? null : (r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) ? Number(r.rating) : null),
            date: r.published_at
              ? new Date(r.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              : 'Recent',
            platform: isIg ? 'instagram' : 'google',
            content: r.content || '',
            sentiment: (r.sentiment_label as any) || 'neutral',
            themes: Array.isArray(r.themes) ? r.themes : [],
          };
        });

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
        averageRating: data.ratingCount > 0 ? Number((data.ratingSum / data.ratingCount).toFixed(2)) : null,
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
          return b.negativeCount - a.negativeCount || ((a.averageRating ?? 5) - (b.averageRating ?? 5));
        }
        if (themeSort === 'rating') {
          return (b.averageRating ?? 0) - (a.averageRating ?? 0);
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
      <div className="p-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center mx-auto text-[#a3a3a3]">
          <Tag className="w-5 h-5" />
        </div>
        <h3 className="font-serif font-light text-xl text-white tracking-[-0.01em]">No Business Selected</h3>
        <p className="text-xs text-[#a3a3a3] font-mono leading-relaxed">
          Select an active business profile from the header to review semantic clusters and customer citations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: TOP HEADER & TELEMETRY SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              Semantic Intelligence
            </span>
            <span className="text-[#404040] font-mono text-xs">/</span>
            <span className="text-xs font-mono text-zinc-300">{activeBusiness.name}</span>
          </div>
          <h1 className="font-serif font-light text-2xl sm:text-3xl text-white tracking-[-0.02em]">
            Thematic Clusters & Sentiment Matrix
          </h1>
          <p className="text-xs text-[#a3a3a3]">
            Interactive breakdown of recurring topics and customer sentiment extracted from verified feedback.
          </p>
        </div>

        {/* Telemetry Stat Badges */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-[#171717] border border-[#262626] text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">Topics</span>
            <span className="text-sm font-bold font-mono text-white tabular-nums">
              {allThemes.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">Praise</span>
            <span className="text-sm font-bold font-mono text-emerald-300 tabular-nums">
              {praiseThemesCount}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-left">
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
        <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-[#4ade80]" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-200">
                Top Thematic Volumes & Sentiment Distribution
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              {/* Graph Legend */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-[#a3a3a3]">Positive</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-[11px] text-[#a3a3a3]">Neutral</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[11px] text-[#a3a3a3]">Negative</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOverviewGraph(!showOverviewGraph)}
                className="text-[11px] text-[#a3a3a3] hover:text-white cursor-pointer underline transition-colors"
              >
                {showOverviewGraph ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {showOverviewGraph && (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] text-[#737373] font-mono">
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
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected
                        ? 'bg-[#1f1f1f] border-[#4ade80] shadow-sm'
                        : 'bg-[#141414] border-[#262626] hover:border-[#404040] hover:bg-[#1c1c1c]'
                        }`}
                    >
                      {/* Theme Name & Rating */}
                      <div className="w-48 shrink-0 flex items-center justify-between pr-2">
                        <span className={`text-xs capitalize font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {theme.name}
                        </span>
                        {theme.averageRating !== null && theme.averageRating !== undefined ? (
                          <span className="text-[11px] font-mono text-[#a3a3a3] flex items-center gap-1">
                            {theme.averageRating.toFixed(1)}
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#737373]">Unrated</span>
                        )}
                      </div>

                      {/* Interactive Horizontal Bar Graph */}
                      <div className="flex-1 h-3 rounded-full bg-[#0a0a0a] border border-[#262626] overflow-hidden flex relative">
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
                        <span className="text-zinc-100 font-semibold tabular-nums">{theme.count}</span>
                        <span className="text-[#737373] text-[10px]">mentions</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
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
          <Loader2 className="w-6 h-6 text-[#4ade80] animate-spin" />
          <p className="text-xs font-mono text-[#a3a3a3]">Synthesizing thematic clusters across reviews...</p>
        </div>
      ) : allThemes.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#171717] border border-[#262626] text-center space-y-3 font-mono">
          <Tag className="w-6 h-6 text-[#737373] mx-auto" />
          <h3 className="font-serif font-light text-lg text-white">No Semantic Themes Extracted</h3>
          <p className="text-xs text-[#737373] max-w-md mx-auto">
            Ingest and analyze customer reviews in Settings to extract topic clusters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN: THEME SELECTOR & FILTERS (5 cols) ─── */}
          <div className="lg:col-span-5 rounded-2xl border border-[#262626] bg-[#171717] p-4 sm:p-5 shadow-sm space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={themeSearch}
                onChange={(e) => setThemeSearch(e.target.value)}
                placeholder="Search topics (e.g., treatment, wait times)..."
                className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-[#737373] focus:outline-none focus:border-[#4ade80] transition-colors font-sans"
              />
            </div>

            {/* Quick Filter Segment Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-[#141414] rounded-full border border-[#262626] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setThemeFilterMode('all')}
                className={`flex-1 py-1 px-2.5 rounded-full transition-colors text-center cursor-pointer ${themeFilterMode === 'all'
                  ? 'bg-[#1f1f1f] text-white font-medium border border-[#333333]'
                  : 'text-[#a3a3a3] hover:text-white'
                  }`}
              >
                All ({allThemes.length})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilterMode('critical')}
                className={`flex-1 py-1 px-2.5 rounded-full transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${themeFilterMode === 'critical'
                  ? 'bg-rose-950/50 text-rose-300 font-medium border border-rose-900/40'
                  : 'text-[#a3a3a3] hover:text-white'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Concerns ({criticalThemesCount})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilterMode('praise')}
                className={`flex-1 py-1 px-2.5 rounded-full transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${themeFilterMode === 'praise'
                  ? 'bg-emerald-950/50 text-emerald-300 font-medium border border-emerald-900/40'
                  : 'text-[#a3a3a3] hover:text-white'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Praise ({praiseThemesCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#a3a3a3] px-1 pt-0.5">
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
                <div className="py-12 text-center text-xs font-mono text-[#737373]">
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${isSelected
                        ? 'bg-[#1f1f1f] border-[#4ade80] shadow-sm'
                        : 'bg-[#141414] border-[#262626] hover:border-[#404040] hover:bg-[#1a1a1a]'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-[#4ade80]' : 'text-[#737373]'}`} />
                          <h4 className="text-xs font-medium text-white capitalize">
                            {theme.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-[#a3a3a3]">{theme.count} mentions</span>
                          <span className="text-[#404040] font-mono">/</span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            {theme.averageRating != null ? theme.averageRating.toFixed(1) : '—'}
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                          </span>
                        </div>
                      </div>

                      {/* Segmented Mini Bar */}
                      <div className="h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden flex">
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
              <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 sm:p-6 shadow-sm space-y-5">
                {/* Theme Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262626]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1f1f1f] border border-[#262626] text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider">
                        Topic Detail
                      </span>
                      <span className="text-xs font-mono text-[#737373]">
                        {currentThemeData.prevalence}% of feedback corpus
                      </span>
                    </div>
                    <h2 className="font-serif font-light text-2xl text-white capitalize tracking-[-0.01em]">
                      {currentThemeData.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {currentThemeData.averageRating !== null && currentThemeData.averageRating !== undefined ? (
                        <div className="flex items-center gap-1 justify-end text-amber-400">
                          <StarRating rating={currentThemeData.averageRating} />
                          <span className="font-mono text-xs font-bold text-white ml-1">
                            {currentThemeData.averageRating.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-[#737373]">
                          Unrated (Social sentiment only)
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#737373] block mt-0.5">
                        {currentThemeData.count} total mentions
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── INTERACTIVE SENTIMENT BAR BREAKDOWN ─── */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block">
                    Sentiment Breakdown (Click bar to filter citations)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Positive Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('positive')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${sentimentFilter === 'positive'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-sm'
                        : 'bg-[#141414] border-[#262626] hover:border-emerald-900/60'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                          <ThumbsUp className="w-3 h-3" />
                          Positive
                        </span>
                        <span className="font-mono text-[#a3a3a3] text-[11px]">
                          {currentThemeData.sentimentRatio.positive}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-white">
                        {currentThemeData.positiveCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.positive}%` }}
                          className="bg-emerald-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Neutral Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('neutral')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${sentimentFilter === 'neutral'
                        ? 'bg-[#1f1f1f] border-zinc-400 shadow-sm'
                        : 'bg-[#141414] border-[#262626] hover:border-[#404040]'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-[#a3a3a3]">
                          <Minus className="w-3 h-3" />
                          Neutral
                        </span>
                        <span className="font-mono text-[#a3a3a3] text-[11px]">
                          {currentThemeData.sentimentRatio.neutral}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-white">
                        {currentThemeData.neutralCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.neutral}%` }}
                          className="bg-zinc-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Negative Bar Box */}
                    <div
                      onClick={() => setSentimentFilter('negative')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${sentimentFilter === 'negative'
                        ? 'bg-rose-950/40 border-rose-500 shadow-sm'
                        : 'bg-[#141414] border-[#262626] hover:border-rose-900/60'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-mono text-rose-400">
                          <ThumbsDown className="w-3 h-3" />
                          Critical
                        </span>
                        <span className="font-mono text-[#a3a3a3] text-[11px]">
                          {currentThemeData.sentimentRatio.negative}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-mono text-white">
                        {currentThemeData.negativeCount}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden">
                        <div
                          style={{ width: `${currentThemeData.sentimentRatio.negative}%` }}
                          className="bg-rose-500 h-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── REVIEW SWITCHER TABS ─── */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
                    {/* The 4 Sentiment Switch Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-full border border-[#262626] text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('all')}
                        className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${sentimentFilter === 'all'
                          ? 'bg-[#1f1f1f] text-white font-medium border border-[#333333]'
                          : 'text-[#a3a3a3] hover:text-white'
                          }`}
                      >
                        All ({themeReviews.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('positive')}
                        className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${sentimentFilter === 'positive'
                          ? 'bg-emerald-950/60 text-emerald-300 font-medium border border-emerald-900/60'
                          : 'text-[#a3a3a3] hover:text-white'
                          }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Positive ({positiveThemeReviewsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('neutral')}
                        className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${sentimentFilter === 'neutral'
                          ? 'bg-[#1f1f1f] text-zinc-200 font-medium border border-zinc-700/60'
                          : 'text-[#a3a3a3] hover:text-white'
                          }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        Neutral ({neutralThemeReviewsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSentimentFilter('negative')}
                        className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${sentimentFilter === 'negative'
                          ? 'bg-rose-950/60 text-rose-300 font-medium border border-rose-900/60'
                          : 'text-[#a3a3a3] hover:text-white'
                          }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Critical ({negativeThemeReviewsCount})
                      </button>
                    </div>

                    {/* Inline Citation Text Search */}
                    <div className="relative w-full sm:w-44">
                      <Search className="w-3 h-3 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={citationSearch}
                        onChange={(e) => setCitationSearch(e.target.value)}
                        placeholder="Search quote..."
                        className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full pl-8 pr-3 py-1 text-[11px] text-white placeholder:text-[#737373] focus:outline-none focus:border-[#4ade80] font-sans"
                      />
                    </div>
                  </div>

                  {/* ─── REVIEW CITATIONS LIST ─── */}
                  <div className="divide-y divide-[#262626] max-h-[460px] overflow-y-auto pr-1">
                    {filteredThemeReviews.length === 0 ? (
                      <div className="py-12 text-center space-y-1.5 font-mono">
                        <CheckCircle2 className="w-5 h-5 text-[#737373] mx-auto" />
                        <p className="text-xs text-[#a3a3a3] font-medium">
                          No {sentimentFilter !== 'all' ? sentimentFilter : ''} reviews found for this topic.
                        </p>
                        <p className="text-[11px] text-[#737373]">
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
                              <span className="font-medium text-white">{rev.author}</span>
                              <span className="text-[#404040] font-mono">/</span>
                              {String(rev.platform).toLowerCase().includes('google') ? (
                                rev.rating !== null && rev.rating !== undefined ? (
                                  <>
                                    <StarRating rating={rev.rating} />
                                    <span className="text-[11px] font-mono text-[#a3a3a3]">
                                      {Number(rev.rating).toFixed(1)} ★
                                    </span>
                                    <span className="text-[#404040] font-mono">/</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[11px] font-mono text-[#737373]">Google (Unrated)</span>
                                    <span className="text-[#404040] font-mono">/</span>
                                  </>
                                )
                              ) : (
                                <>
                                  <span className="text-[11px] font-mono text-[#737373]">Instagram Comment</span>
                                  <span className="text-[#404040] font-mono">/</span>
                                </>
                              )}
                              <span className="text-[11px] font-mono text-[#737373]">{rev.date}</span>
                              <span className="text-[#404040] font-mono">/</span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 px-2 py-0.5 rounded-full border border-[#262626] bg-[#1f1f1f] inline-flex items-center gap-1.5">
                                {String(rev.platform).toLowerCase().includes('google') ? (
                                  <span>Google Review</span>
                                ) : (
                                  <span className="flex items-center gap-1 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 inline-block" />
                                    <span>Instagram</span>
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${rev.sentiment === 'positive'
                                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40'
                                  : rev.sentiment === 'negative'
                                    ? 'bg-rose-950/30 text-rose-300 border-rose-900/40'
                                    : 'bg-[#1f1f1f] text-[#a3a3a3] border-[#262626]'
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${rev.sentiment === 'positive'
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
                                className="text-[11px] font-mono text-[#a3a3a3] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Evidence</span>
                                <ExternalLink className="w-3 h-3 text-[#4ade80]" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-300 leading-relaxed font-sans pl-2.5 border-l-2 border-[#262626] group-hover:border-[#4ade80] transition-colors">
                            “{rev.content}”
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 rounded-2xl border border-[#262626] bg-[#171717] text-center font-mono text-xs text-[#737373]">
                Select a topic from the left to view customer citations.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
