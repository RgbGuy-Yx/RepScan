import { useState, useEffect } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';
import type { ReviewItem, PlatformType, SentimentType } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';
import googleIcon from '../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';
import { Select } from '../components/ui/Dropdown';

interface ReviewsViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

function StarRating({ rating, max = 5 }: { rating: number | string; max?: number }) {
  const safeRating = Math.max(0, Math.min(max, Number(rating) || 0));
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
          const list = Array.isArray(rawReviews) ? rawReviews : [];
          const mapped: ReviewItem[] = list.map((r: any) => {
            const platformStr = String(r?.platform || 'google').toLowerCase();
            const platform: PlatformType = platformStr.includes('instagram')
              ? 'instagram'
              : platformStr.includes('linkedin')
              ? 'linkedin'
              : 'google';

            const parsedRating = r?.rating !== null && r?.rating !== undefined ? Number(r.rating) : 5;
            const safeRating = isNaN(parsedRating) ? 5 : parsedRating;

            const safeThemes = Array.isArray(r?.themes)
              ? r.themes.filter(Boolean).map(String)
              : typeof r?.themes === 'string'
              ? [r.themes]
              : [];

            return {
              id: String(r?.id || `rev_${Math.random()}`),
              author: r?.author || 'Verified Customer',
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

  const filteredReviews = reviews.filter((rev) => {
    const content = (rev.content || '').toLowerCase();
    const author = (rev.author || '').toLowerCase();
    const themes = Array.isArray(rev.themes) ? rev.themes : [];

    const matchesSearch =
      !searchLower ||
      content.includes(searchLower) ||
      author.includes(searchLower) ||
      themes.some((t) => typeof t === 'string' && t.toLowerCase().includes(searchLower));

    const matchesPlatform = platformFilter === 'all' || rev.platform === platformFilter;
    const matchesSentiment = sentimentFilter === 'all' || rev.sentiment === sentimentFilter;

    return matchesSearch && matchesPlatform && matchesSentiment;
  });

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

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
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
              {
                value: 'google',
                label: 'Google Maps',
                icon: <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain shrink-0" />,
              },
              { value: 'instagram', label: 'Instagram' },
              { value: 'linkedin', label: 'LinkedIn' },
            ]}
            size="sm"
            variant="default"
            className="w-36"
          />

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

      {/* Reviews List */}
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
        <div className="space-y-3">
          {filteredReviews.map((rev) => {
            const displayRating = Number(rev.rating || 0);
            return (
              <div
                key={rev.id}
                className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">{rev.author}</span>
                      <span className="text-zinc-600 font-mono">/</span>
                      <span className="text-[11px] font-mono text-zinc-500">{rev.date}</span>
                      <span className="text-zinc-600 font-mono">/</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider border border-zinc-800 bg-zinc-900/60 text-zinc-300 inline-flex items-center gap-1.5">
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

                    <div className="flex items-center gap-2">
                      <StarRating rating={displayRating} />
                      <span className="text-[11px] font-mono text-zinc-500">
                        {displayRating.toFixed(1)} / 5.0
                      </span>
                    </div>
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
                    {rev.themes.map((t, idx) => (
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
      )}
    </div>
  );
}
