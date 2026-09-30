import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { MOCK_REVIEWS } from '../mock/dashboardData';
import type { ReviewItem, PlatformType, SentimentType } from '../types/dashboard';

interface ReviewsViewProps {
  onOpenProof: (review: ReviewItem) => void;
  onCreateTask: (review: ReviewItem) => void;
}

export default function ReviewsView({ onOpenProof, onCreateTask }: ReviewsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformType>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | SentimentType>('all');

  const filteredReviews = MOCK_REVIEWS.filter((rev) => {
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
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                platformFilter === p
                  ? 'bg-[#1f2023] text-[#f7f8f8] border border-[#34343a] shadow-xs font-medium'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              {p === 'all' ? 'All Platforms' : p}
            </button>
          ))}
        </div>

        {/* Sentiment Filter Dropdown */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#141516] border border-[#23252a] text-xs font-medium">
          {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentimentFilter(s)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                sentimentFilter === s
                  ? 'bg-[#1f2023] text-[#f7f8f8] border border-[#34343a] shadow-xs font-medium'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3.5">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-[#0f1011] rounded-xl border border-[#23252a] text-[#8a8f98] text-xs">
            No customer reviews found matching your search and filter criteria.
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-xl bg-[#0f1011] border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Platform Indicator */}
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {rev.platform === 'google' ? (
                      <span className="text-red-400 bg-red-950/40 w-full h-full rounded-md flex items-center justify-center border border-red-900/30">
                        G
                      </span>
                    ) : rev.platform === 'instagram' ? (
                      <span className="text-pink-400 bg-pink-950/40 w-full h-full rounded-md flex items-center justify-center border border-pink-900/30 text-[10px]">
                        IG
                      </span>
                    ) : (
                      <span className="text-blue-400 bg-blue-950/40 w-full h-full rounded-md flex items-center justify-center border border-blue-900/30 text-xs">
                        in
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f7f8f8]">{rev.author}</span>
                      <span className="text-xs text-[#62666d]">·</span>
                      <span className="text-xs text-[#8a8f98]">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      <div className="flex text-amber-400">
                        {'★'.repeat(rev.rating)}
                        <span className="text-[#23252a]">{'★'.repeat(5 - rev.rating)}</span>
                      </div>
                      <span className="text-[#8a8f98] font-medium">({rev.rating}.0)</span>
                      <span
                        className={`ml-2 text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
                          rev.sentiment === 'positive'
                            ? 'bg-[#27a644]/15 text-[#4ade80] border border-[#27a644]/30'
                            : rev.sentiment === 'negative'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
                        }`}
                      >
                        {rev.sentiment}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProof(rev)}
                    className="linear-btn-secondary text-xs h-8 px-3"
                  >
                    View Proof
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateTask(rev)}
                    className="linear-btn-primary text-xs h-8 px-3 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Action</span>
                  </button>
                </div>
              </div>

              {/* Review Text Content */}
              <p className="mt-3 text-xs sm:text-sm text-[#d0d6e0] leading-relaxed pl-11">
                “{rev.content}”
              </p>

              {/* Extracted Theme Tags */}
              <div className="mt-3 pt-3 border-t border-[#23252a] pl-11 flex flex-wrap gap-2 text-xs">
                {rev.themes.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-[#141516] border border-[#23252a] text-[#8a8f98] text-[11px] font-medium"
                  >
                    #{t}
                  </span>
                ))}
                <span className="font-mono text-[10px] text-[#62666d] ml-auto self-center">
                  id:{rev.id}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
