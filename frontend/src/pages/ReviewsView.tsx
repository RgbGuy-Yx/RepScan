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
            className={`w-3 h-3 ${fill ? 'text-amber-400 fill-amber-400' : 'text-[#404040] fill-transparent'}`}
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
      <div className="p-16 max-w-lg mx-auto text-center space-y-4 font-sans">
        <div className="w-10 h-10 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center mx-auto text-[#737373]">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="font-serif font-light text-2xl text-white">No Business Selected</h3>
        <p className="text-xs text-[#a3a3a3]">
          Select an active business from the header selector to inspect customer reviews.
        </p>
      </div>
    );
  }

  const googleCount = reviews.filter((r) => r.platform === 'google').length;
  const instagramCount = reviews.filter((r) => r.platform === 'instagram').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Channel Division & Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={platformFilter === 'all' ? 'btn-pill-primary text-xs py-1.5 px-4' : 'btn-pill-secondary text-xs py-1.5 px-4'}
          >
            <span>All Feedback</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                platformFilter === 'all' ? 'bg-[#0a0a0a] text-white' : 'bg-[#262626] text-[#a3a3a3]'
              }`}
            >
              {reviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('google')}
            className={platformFilter === 'google' ? 'btn-pill-primary text-xs py-1.5 px-4' : 'btn-pill-secondary text-xs py-1.5 px-4'}
          >
            <span>Google Reviews</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                platformFilter === 'google' ? 'bg-[#0a0a0a] text-white' : 'bg-[#262626] text-[#a3a3a3]'
              }`}
            >
              {googleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('instagram')}
            className={platformFilter === 'instagram' ? 'btn-pill-primary text-xs py-1.5 px-4' : 'btn-pill-secondary text-xs py-1.5 px-4'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
            <span>Instagram Comments</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                platformFilter === 'instagram' ? 'bg-[#0a0a0a] text-white' : 'bg-[#262626] text-[#a3a3a3]'
              }`}
            >
              {instagramCount}
            </span>
          </button>
        </div>

        <div className="text-xs text-[#737373]">
          {platformFilter === 'all' && <span>Combined multi-channel telemetry stream</span>}
          {platformFilter === 'google' && <span>Google Maps reviews (Rated 1-5★)</span>}
          {platformFilter === 'instagram' && <span>Instagram post comments (Sentiment classified)</span>}
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#171717] border border-[#262626]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reviews by keyword, patient name, or treatment tag..."
            className="w-full h-9 pl-10 pr-4 text-xs rounded-full border border-[#262626] bg-[#1f1f1f] text-white placeholder:text-[#737373] focus:outline-none focus:border-[#404040] transition-colors"
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
            variant="pill"
            className="w-36"
          />

          {/* Browse Instagram Posts Trigger (if accounts exist) */}
          {instagramAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIgAccount(instagramAccounts[0])}
              className="btn-pill-secondary h-9 text-xs"
              title="Inspect crawled Instagram posts and comment threads"
            >
              <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
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
                icon: <span className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />,
              },
              {
                value: 'neutral',
                label: 'Neutral',
                icon: <span className="w-2 h-2 rounded-full bg-[#737373] shrink-0" />,
              },
              {
                value: 'negative',
                label: 'Critical / Negative',
                icon: <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />,
              },
            ]}
            size="sm"
            variant="pill"
            className="w-40"
          />
        </div>
      </div>

      {/* Target for scrolling upon page change */}
      <div ref={reviewsListRef} className="scroll-mt-4" />

      {/* Reviews List & Pagination */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-5 h-5 text-[#4ade80] animate-spin" />
          <p className="text-xs text-[#a3a3a3] font-mono">Loading reviews from database...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#171717] border border-[#262626] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center mx-auto text-[#737373]">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-light text-xl text-white">No Customer Reviews Found</h3>
          <p className="text-xs text-[#a3a3a3] max-w-sm mx-auto">
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
                  className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-colors space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-white">
                          {rev.platform === 'instagram' ? `@${rev.author}` : rev.author}
                        </span>
                        <span className="text-[#404040]">/</span>
                        <span className="text-xs text-[#737373]">{rev.date}</span>
                        <span className="text-[#404040]">/</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#262626] bg-[#1f1f1f] text-white inline-flex items-center gap-1.5 font-medium">
                          {rev.platform === 'google' ? (
                            <span>Google Review</span>
                          ) : (
                            <span className="text-white flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
                              <span>Instagram</span>
                            </span>
                          )}
                        </span>
                      </div>

                      {rev.platform === 'google' ? (
                        rev.rating != null ? (
                          <div className="flex items-center gap-2">
                            <StarRating rating={rev.rating} />
                            <span className="text-xs text-[#a3a3a3]">
                              {Number(rev.rating).toFixed(1)} / 5.0 (Google Review)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#737373]">
                              Google Review • Unrated
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#737373]">
                            Instagram Comment • Social Sentiment
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sentiment Badge & Actions */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                          rev.sentiment === 'positive'
                            ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30'
                            : rev.sentiment === 'negative'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-[#1f1f1f] text-[#a3a3a3] border-[#262626]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rev.sentiment === 'positive'
                              ? 'bg-[#22c55e]'
                              : rev.sentiment === 'negative'
                                ? 'bg-rose-400'
                                : 'bg-[#737373]'
                          }`}
                        />
                        <span className="capitalize">{rev.sentiment}</span>
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <p
                    onClick={() => onOpenProof(rev)}
                    className="text-xs text-[#a3a3a3] leading-relaxed cursor-pointer hover:text-white transition-colors"
                  >
                    {rev.content}
                  </p>

                  {/* Theme Tags */}
                  {Array.isArray(rev.themes) && rev.themes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {rev.themes.map((t: string, idx: number) => (
                        <span
                          key={`${t}-${idx}`}
                          className="badge-neutral text-[10px]"
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#171717] border border-[#262626] text-xs font-sans">
              {/* Left: Summary */}
              <div className="text-[#a3a3a3]">
                Showing <span className="font-medium text-white">{startIndex + 1}</span>–
                <span className="font-medium text-white">{endIndex}</span> of{' '}
                <span className="font-medium text-white">{totalReviewsCount}</span> reviews
              </div>

              {/* Center: Rows per page */}
              <div className="flex items-center gap-2 text-[#a3a3a3]">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 px-3 rounded-full bg-[#1f1f1f] border border-[#262626] text-white focus:outline-none focus:border-[#404040] cursor-pointer"
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
                  className="btn-pill-secondary p-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  title="Previous Page"
                  className="btn-pill-secondary p-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Numbered buttons */}
                <div className="flex items-center gap-1 mx-1">
                  {pageNumbers.map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#737373] select-none">
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
                        className={`min-w-8 h-8 px-2.5 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#0a0a0a] font-medium shadow-sm'
                            : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#a3a3a3] hover:text-white border border-[#262626]'
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
                  className="btn-pill-secondary p-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  title="Last Page"
                  className="btn-pill-secondary p-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
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
