import { useState } from 'react';
import { ArrowUp, ArrowDown, Tag } from 'lucide-react';
import { MOCK_THEMES, MOCK_REVIEWS } from '../mock/dashboardData';
import type { ReviewItem } from '../types/dashboard';

interface ThemesViewProps {
  onOpenProof: (review: ReviewItem) => void;
}

export default function ThemesView({ onOpenProof }: ThemesViewProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(MOCK_THEMES[0].name);

  const activeThemeReviews = MOCK_REVIEWS.filter((r) => r.themes.includes(selectedTheme));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MOCK_THEMES.map((theme) => {
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
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${
                    theme.isIncrease ? 'text-rose-400' : 'text-[#4ade80]'
                  }`}
                >
                  {theme.isIncrease ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {theme.changePercent}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between text-xs text-[#8a8f98]">
                <span>Mentions this week</span>
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
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
          <div>
            <h2 className="text-sm font-semibold text-[#f7f8f8]">
              Verified Feedback for “{selectedTheme}”
            </h2>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Showing verified customer quotes linked to this extracted topic.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#141516] border border-[#23252a] text-[#8a8f98]">
            {activeThemeReviews.length} Verified Citations
          </span>
        </div>

        <div className="mt-2 divide-y divide-[#23252a]">
          {activeThemeReviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#62666d]">
              No individual customer reviews available for this sample theme.
            </div>
          ) : (
            activeThemeReviews.map((rev) => (
              <div key={rev.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#f7f8f8]">{rev.author}</span>
                    <span className="text-[#62666d]">·</span>
                    <span className="text-amber-400 font-medium">{'★'.repeat(rev.rating)}</span>
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
                  className="linear-btn-secondary text-xs h-7 px-2.5 shrink-0"
                >
                  Inspect Proof
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
