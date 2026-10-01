import { useState, useEffect } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';

interface ThemesViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

interface LiveTheme {
  name: string;
  count: number;
  prevalence: number;
  sentimentRatio: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export default function ThemesView({ onOpenProof }: ThemesViewProps) {
  const { activeBusiness } = useBusiness();
  const [themes, setThemes] = useState<LiveTheme[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeBusiness?.id) {
      setThemes([]);
      setReviews([]);
      return;
    }

    let isMounted = true;
    const fetchThemesAndReviews = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, rawReviews] = await Promise.all([
          businessApi.getWeeklyAnalytics(activeBusiness.id).catch(() => null),
          businessApi.listReviews(activeBusiness.id).catch(() => []),
        ]);

        if (!isMounted) return;

        if (analyticsData?.currentMetrics?.themes) {
          const mappedThemes: LiveTheme[] = analyticsData.currentMetrics.themes.map((t) => {
            const total = (t.positiveCount || 0) + (t.neutralCount || 0) + (t.negativeCount || 0) || 1;
            return {
              name: t.theme,
              count: t.count,
              prevalence: t.prevalence,
              sentimentRatio: {
                positive: Math.round(((t.positiveCount || 0) / total) * 100),
                neutral: Math.round(((t.neutralCount || 0) / total) * 100),
                negative: Math.round(((t.negativeCount || 0) / total) * 100),
              },
            };
          });
          setThemes(mappedThemes);
          if (mappedThemes.length > 0) {
            setSelectedTheme(mappedThemes[0].name);
          }
        } else {
          setThemes([]);
          setSelectedTheme(null);
        }

        const mappedReviews: ReviewItem[] = (rawReviews || []).map((r) => ({
          id: r.id,
          author: r.author || 'Customer',
          rating: r.rating || 5,
          date: r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Recent',
          platform: (r.platform?.toLowerCase() as any) || 'google',
          content: r.content,
          sentiment: (r.sentiment_label as any) || 'neutral',
          themes: r.themes || [],
        }));
        setReviews(mappedReviews);
      } catch (err) {
        console.warn('Failed to load live themes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchThemesAndReviews();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  const activeThemeReviews = selectedTheme
    ? reviews.filter((r) => r.themes.some((t) => t.toLowerCase() === selectedTheme.toLowerCase()))
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
          <p className="text-xs text-[#8a8f98]">Analyzing thematic clusters from database...</p>
        </div>
      ) : themes.length === 0 ? (
        <div className="p-16 rounded-xl bg-[#0f1011] border border-[#23252a] text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-center mx-auto text-[#62666d]">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#f7f8f8]">No Thematic Clusters Detected</h3>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
            Thematic clusters are synthesized dynamically as customer reviews are crawled and analyzed for {activeBusiness?.name || 'this business'}.
          </p>
        </div>
      ) : (
        <>
          {/* Theme Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {themes.map((theme) => {
              const isSelected = selectedTheme === theme.name;
              return (
                <div
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#141516] border-[#5e6ad2] shadow-[0_0_0_1px_#5e6ad2,inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                      : 'bg-[#0f1011] border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className={`w-4 h-4 ${isSelected ? 'text-[#828fff]' : 'text-[#8a8f98]'}`} />
                      <h3 className="text-sm font-semibold text-[#f7f8f8]">{theme.name}</h3>
                    </div>
                    <span className="text-xs font-medium text-[#8a8f98]">
                      {theme.prevalence}% of reviews
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs text-[#8a8f98]">
                    <span>Extracted Mentions</span>
                    <strong className="text-base text-[#f7f8f8] font-semibold tabular-nums">
                      {theme.count}
                    </strong>
                  </div>

                  {/* Segmented Sentiment Bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-[#18191a] overflow-hidden flex">
                    <div
                      style={{ width: `${theme.sentimentRatio.positive}%` }}
                      className="bg-[#27a644] h-full"
                      title={`Positive ${theme.sentimentRatio.positive}%`}
                    />
                    <div
                      style={{ width: `${theme.sentimentRatio.neutral}%` }}
                      className="bg-[#2e3037] h-full"
                      title={`Neutral ${theme.sentimentRatio.neutral}%`}
                    />
                    <div
                      style={{ width: `${theme.sentimentRatio.negative}%` }}
                      className="bg-[#f43f5e] h-full"
                      title={`Negative ${theme.sentimentRatio.negative}%`}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[10px] text-[#62666d]">
                    <span className="text-[#4ade80] font-medium">
                      {theme.sentimentRatio.positive}% pos
                    </span>
                    <span>{theme.sentimentRatio.neutral}% neu</span>
                    <span className="text-rose-400 font-medium">
                      {theme.sentimentRatio.negative}% neg
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Theme Customer Citations Drawer */}
          {selectedTheme && (
            <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
                <div>
                  <h2 className="text-sm font-semibold text-[#f7f8f8]">
                    Verified Feedback for “{selectedTheme}”
                  </h2>
                  <p className="text-xs text-[#8a8f98] mt-0.5">
                    Grounded review citations in PostgreSQL linked to this cluster.
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#141516] border border-[#23252a] text-[#8a8f98]">
                  {activeThemeReviews.length} Verified Citations
                </span>
              </div>

              <div className="mt-2 divide-y divide-[#23252a]">
                {activeThemeReviews.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#62666d]">
                    No individual customer reviews available for this theme yet.
                  </div>
                ) : (
                  activeThemeReviews.map((rev) => (
                    <div key={rev.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#f7f8f8]">{rev.author}</span>
                          <span className="text-[#62666d]">·</span>
                          <span className="text-amber-400 font-medium">
                            {'★'.repeat(Math.min(5, Math.max(1, rev.rating)))}
                          </span>
                          <span className="text-[#62666d]">·</span>
                          <span className="capitalize text-[#8a8f98]">{rev.platform}</span>
                        </div>
                        <p className="text-xs text-[#d0d6e0] leading-relaxed pt-0.5">
                          “{rev.content}”
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenProof(rev)}
                        className="linear-btn-secondary text-xs h-7 px-2.5 shrink-0 cursor-pointer"
                      >
                        Inspect Proof
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
