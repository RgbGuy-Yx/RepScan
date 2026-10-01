import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, FileText } from 'lucide-react';
import type { ReviewItem, PlatformType, SentimentType } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';

interface ReviewsViewProps {
  onOpenProof: (review: ReviewItem) => void;
  onCreateTask: (review: ReviewItem) => void;
}

export default function ReviewsView({ onOpenProof, onCreateTask }: ReviewsViewProps) {
  const { activeBusiness } = useBusiness();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformType>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | SentimentType>('all');

  useEffect(() => {
    if (!activeBusiness?.id) {
      setReviews([]);
      return;
    }

    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const rawReviews = await businessApi.listReviews(activeBusiness.id);
        if (isMounted) {
          const mapped: ReviewItem[] = rawReviews.map((r) => {
            const platformStr = r.platform.toLowerCase();
            const platform: PlatformType = platformStr.includes('google')
              ? 'google'
              : platformStr.includes('instagram')
              ? 'instagram'
              : 'linkedin';

            return {
              id: r.id,
              author: r.author || 'Anonymous Guest',
              rating: r.rating || 5,
              date: r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Recent',
              platform,
              content: r.content,
              sentiment: (r.sentiment_label as SentimentType) || 'neutral',
              themes: r.themes || [],
              originalLanguage: r.language || 'English',
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

  const filteredReviews = reviews.filter((rev) => {
    const matchesSearch =
      rev.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.themes.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlatform = platformFilter === 'all' || rev.platform === platformFilter;
    const matchesSentiment = sentimentFilter === 'all' || rev.sentiment === sentimentFilter;

    return matchesSearch && matchesPlatform && matchesSentiment;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0f1011] border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#62666d] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keyword, customer name, or theme tag…"
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          />
        </div>

        {/* Platform Filter Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#141516] border border-[#23252a] text-xs font-medium">
          {(['all', 'google', 'instagram', 'linkedin'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatformFilter(p)}
              className={`px-2.5 py-1 rounded capitalize transition-all cursor-pointer ${
                platformFilter === p
                  ? 'bg-[#1e2024] text-[#f7f8f8] shadow-sm'
                  : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sentiment Filter Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#141516] border border-[#23252a] text-xs font-medium">
          {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentimentFilter(s)}
              className={`px-2.5 py-1 rounded capitalize transition-all cursor-pointer ${
                sentimentFilter === s
                  ? 'bg-[#1e2024] text-[#f7f8f8] shadow-sm'
                  : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
          <p className="text-xs text-[#8a8f98]">Loading reviews from PostgreSQL...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-16 rounded-xl bg-[#0f1011] border border-[#23252a] text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-center mx-auto text-[#62666d]">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#f7f8f8]">No Customer Reviews Found</h3>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
            {reviews.length === 0
              ? `No reviews have been ingested yet for ${activeBusiness?.name || 'this business'}. Connect Google Reviews in Settings to run a crawl.`
              : 'No reviews match your current search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] transition-all space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#f7f8f8]">{rev.author}</span>
                    <span className="text-[11px] text-[#62666d]">·</span>
                    <span className="text-[11px] text-[#8a8f98]">{rev.date}</span>
                    <span className="text-[11px] text-[#62666d]">·</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase border ${
                        rev.platform === 'google'
                          ? 'bg-red-950/40 text-red-300 border-red-900/30'
                          : rev.platform === 'instagram'
                          ? 'bg-pink-950/40 text-pink-300 border-pink-900/30'
                          : 'bg-blue-950/40 text-blue-300 border-blue-900/30'
                      }`}
                    >
                      {rev.platform}
                    </span>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xs ${
                          star <= rev.rating ? 'text-amber-400' : 'text-[#23252a]'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-[11px] font-mono text-[#8a8f98] ml-1">
                      {rev.rating}.0
                    </span>
                  </div>
                </div>

                {/* Sentiment Badge & Actions */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                      rev.sentiment === 'positive'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/30'
                        : rev.sentiment === 'negative'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-900/30'
                        : 'bg-amber-950/40 text-amber-300 border-amber-900/30'
                    }`}
                  >
                    {rev.sentiment}
                  </span>

                  <button
                    type="button"
                    onClick={() => onCreateTask(rev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[11px] font-medium text-[#d0d6e0] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#5e6ad2]" />
                    <span>Create Task</span>
                  </button>
                </div>
              </div>

              {/* Review Text */}
              <p
                onClick={() => onOpenProof(rev)}
                className="text-xs text-[#d0d6e0] leading-relaxed cursor-pointer hover:text-[#f7f8f8] transition-colors"
              >
                {rev.content}
              </p>

              {/* Theme Tags */}
              {rev.themes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {rev.themes.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#141516] border border-[#23252a] text-[#8a8f98]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
