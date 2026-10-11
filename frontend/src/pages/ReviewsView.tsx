import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Loader2,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ReviewItem, PlatformType, SentimentType } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';
import { instagramApi, type InstagramAccount } from '../api/instagramApi';
import InstagramPostsDrawer from '../components/instagram/InstagramPostsDrawer';
import { Select } from '../components/ui/Dropdown';

interface ReviewsViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

function StarRating({ rating, max = 5 }: { rating: number | string | null | undefined; max?: number }) {
  if (rating === null || rating === undefined) return null;
  const num = Number(rating);
  if (isNaN(num) || num <= 0) return null;
  const safeRating = Math.max(0, Math.min(max, num));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safeRating.toFixed(1)} out of ${max} stars`}>
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

export default function ReviewsView({ onOpenProof }: ReviewsViewProps) {
  const { activeBusiness } = useBusiness();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformType>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | SentimentType>('all');
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedIgAccount, setSelectedIgAccount] = useState<InstagramAccount | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const reviewsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeBusiness?.id) {
      setReviews([]);
      return;
    }

    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const [rawReviews, igAccs] = await Promise.all([
          businessApi.listReviews(activeBusiness.id).catch(() => []),
          instagramApi.listAccounts(activeBusiness.id).catch(() => []),
        ]);
        if (isMounted) {
          setInstagramAccounts(igAccs || []);
          const list = Array.isArray(rawReviews) ? rawReviews : [];
          const mapped: ReviewItem[] = list.map((r: any) => {
            const platformStr = String(r?.platform || 'google').toLowerCase();
            const isInstagram = platformStr.includes('instagram');
            const platform: PlatformType = isInstagram ? 'instagram' : 'google';

            const parsedRating = r?.rating !== null && r?.rating !== undefined ? Number(r.rating) : null;
            const safeRating = isInstagram ? null : (parsedRating !== null && !isNaN(parsedRating) ? parsedRating : null);

            const safeThemes = Array.isArray(r?.themes)
              ? r.themes.filter(Boolean).map(String)
              : typeof r?.themes === 'string'
                ? [r.themes]
                : [];

            return {
              id: String(r?.id || `rev_${Math.random()}`),
              author: r?.author || (isInstagram ? 'Instagram User' : 'Verified Customer'),
              rating: safeRating,
              date: r?.published_at
                ? new Date(r.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent',
              platform,
              content: r?.content || '',
              sentiment: (r?.sentiment_label as SentimentType) || 'neutral',
              themes: safeThemes,
              originalLanguage: r?.language || 'English',
            };
          });
          setReviews(mapped);
        }
      } catch (err) {
        console.warn('Could not fetch reviews:', err);
        if (isMounted) setReviews([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  const searchLower = searchTerm.trim().toLowerCase();

  const filteredReviews = useMemo(() => {
    return reviews.filter((rev: ReviewItem) => {
      const content = (rev.content || '').toLowerCase();
      const author = (rev.author || '').toLowerCase();
      const themes = Array.isArray(rev.themes) ? rev.themes : [];

      const matchesSearch =
        !searchLower ||
        content.includes(searchLower) ||
        author.includes(searchLower) ||
        themes.some((t: string) => typeof t === 'string' && t.toLowerCase().includes(searchLower));

      const matchesPlatform = platformFilter === 'all' || rev.platform === platformFilter;
      const matchesSentiment = sentimentFilter === 'all' || rev.sentiment === sentimentFilter;

      return matchesSearch && matchesPlatform && matchesSentiment;
    });
  }, [reviews, searchLower, platformFilter, sentimentFilter]);

  // Reset to page 1 whenever filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, platformFilter, sentimentFilter, pageSize]);

  // Pagination computations
  const totalReviewsCount = filteredReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalReviewsCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalReviewsCount);

  const paginatedReviews = useMemo(() => {
    return filteredReviews.slice(startIndex, endIndex);
  }, [filteredReviews, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    if (reviewsListRef.current) {
      reviewsListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  }, [safeCurrentPage, totalPages]);

  if (!activeBusiness) {
    return (
      <div className="p-16 max-w-lg mx-auto text-center space-y-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No Business Selected</h3>
        <p className="text-xs text-zinc-400">
          Select an active business from the header selector to inspect customer reviews.
        </p>
      </div>
    );
  }

  const googleCount = reviews.filter((r) => r.platform === 'google').length;
  const instagramCount = reviews.filter((r) => r.platform === 'instagram').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Channel Division & Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
              platformFilter === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span>All Feedback</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                platformFilter === 'all' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {reviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('google')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
              platformFilter === 'google'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span>Google Reviews</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                platformFilter === 'google' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {googleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('instagram')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
              platformFilter === 'instagram'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 inline-block" />
            <span>Instagram Comments</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                platformFilter === 'instagram' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {instagramCount}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-500">
          {platformFilter === 'all' && <span>Combined multi-channel telemetry stream</span>}
          {platformFilter === 'google' && <span>Google Maps reviews (Rated 1-5★)</span>}
          {platformFilter === 'instagram' && <span>Instagram post comments (Sentiment classified, unrated)</span>}
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reviews by keyword, patient name, or treatment tag..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-zinc-800 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Dropdown Filters Container */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Platform Filter Dropdown */}
          <Select<string>
            value={platformFilter}
            onChange={(val) => setPlatformFilter(val as any)}
            options={[
              { value: 'all', label: 'All Channels' },
              { value: 'google', label: 'Google Maps' },
              { value: 'instagram', label: 'Instagram' },
            ]}
            size="sm"
            variant="default"
            className="w-36"
          />

          {/* Browse Instagram Posts Trigger (if accounts exist) */}
          {instagramAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIgAccount(instagramAccounts[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-md text-xs font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer active:scale-[0.98]"
              title="Inspect crawled Instagram posts and comment threads"
            >
              <Layers className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span className="hidden sm:inline">Browse Posts ({instagramAccounts[0].posts_count || 0})</span>
              <span className="sm:hidden">Posts</span>
            </button>
          )}

          {/* Sentiment Filter Dropdown */}
          <Select<string>
            value={sentimentFilter}
            onChange={(val) => setSentimentFilter(val as any)}
            options={[
              { value: 'all', label: 'All Sentiments' },
              {
                value: 'positive',
                label: 'Positive',
                icon: <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />,
              },
              {
                value: 'neutral',
                label: 'Neutral',
                icon: <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />,
              },
              {
                value: 'negative',
                label: 'Critical / Negative',
                icon: <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />,
              },
            ]}
            size="sm"
            variant="default"
            className="w-40"
          />
        </div>
      </div>

      {/* Target for scrolling upon page change */}
      <div ref={reviewsListRef} className="scroll-mt-4" />

      {/* Reviews List & Pagination */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Loading reviews from database...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-16 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-100">No Customer Reviews Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {reviews.length === 0
              ? `No reviews have been ingested yet for ${activeBusiness?.name || 'this business'}. Connect Google Reviews in Settings to run a crawl.`
              : 'No reviews match your current search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Reviews Cards List */}
          <div className="space-y-3">
            {paginatedReviews.map((rev: ReviewItem) => {
              return (
                <div
                  key={rev.id}
                  className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-zinc-200">
                          {rev.platform === 'instagram' ? `@${rev.author}` : rev.author}
                        </span>
                        <span className="text-zinc-600 font-mono">/</span>
                        <span className="text-[11px] font-mono text-zinc-500">{rev.date}</span>
                        <span className="text-zinc-600 font-mono">/</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-zinc-800 bg-zinc-900/60 text-zinc-300 inline-flex items-center gap-1.5">
                          {rev.platform === 'google' ? (
                            <span>Google Review</span>
                          ) : (
                            <span className="text-zinc-300 flex items-center gap-1 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 inline-block" />
                              <span>Instagram</span>
                            </span>
                          )}
                        </span>
                      </div>

                      {rev.platform === 'google' ? (
                        rev.rating != null ? (
                          <div className="flex items-center gap-2">
                            <StarRating rating={rev.rating} />
                            <span className="text-[11px] font-mono text-zinc-400">
                              {Number(rev.rating).toFixed(1)} / 5.0 (Google Review)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-zinc-500">
                              Google Review • Unrated
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-500">
                            Instagram Comment • Social Sentiment Only (No Star Rating)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sentiment Badge & Actions */}
                    <div className="flex items-center gap-2">
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

                  {/* Review Text */}
                  <p
                    onClick={() => onOpenProof(rev)}
                    className="text-xs text-zinc-300 leading-relaxed cursor-pointer hover:text-zinc-100 transition-colors"
                  >
                    {rev.content}
                  </p>

                  {/* Theme Tags */}
                  {Array.isArray(rev.themes) && rev.themes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {rev.themes.map((t: string, idx: number) => (
                        <span
                          key={`${t}-${idx}`}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Pagination Bar */}
          {totalReviewsCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] text-xs font-mono">
              {/* Left: Summary */}
              <div className="text-zinc-400">
                Showing <span className="font-semibold text-zinc-100">{startIndex + 1}</span>–
                <span className="font-semibold text-zinc-100">{endIndex}</span> of{' '}
                <span className="font-semibold text-zinc-100">{totalReviewsCount}</span> reviews
              </div>

              {/* Center: Rows per page */}
              <div className="flex items-center gap-2 text-zinc-400">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={safeCurrentPage === 1}
                  title="First Page"
                  className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  title="Previous Page"
                  className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numbered buttons */}
                <div className="flex items-center gap-1 mx-1">
                  {pageNumbers.map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-zinc-600 select-none">
                          …
                        </span>
                      );
                    }
                    const pageNum = Number(p);
                    const isActive = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-8 h-8 px-2 rounded-md font-mono text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-100 shadow-sm'
                            : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  title="Next Page"
                  className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  title="Last Page"
                  className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instagram Posts Drawer */}
      {selectedIgAccount && activeBusiness && (
        <InstagramPostsDrawer
          businessId={activeBusiness.id}
          account={selectedIgAccount}
          onClose={() => setSelectedIgAccount(null)}
        />
      )}
    </div>
  );
}
