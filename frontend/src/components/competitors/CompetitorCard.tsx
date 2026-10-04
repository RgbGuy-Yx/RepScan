import type { CompetitorItem } from '../../api/competitorApi';
import { MapPin, ChevronRight, Building2, BookmarkCheck, Star } from 'lucide-react';

interface CompetitorCardProps {
  competitor: CompetitorItem;
  isSelected: boolean;
  onSelect: (competitor: CompetitorItem) => void;
}

export default function CompetitorCard({
  competitor,
  isSelected,
  onSelect,
}: CompetitorCardProps) {
  const formatCategory = (type?: string | null) => {
    if (!type) return 'Competitor';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const isNearby = competitor.distance_km != null && competitor.distance_km <= 1.5;

  return (
    <div
      id={`competitor-card-${competitor.place_id}`}
      onClick={() => onSelect(competitor)}
      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.985] ${
        isSelected
          ? 'bg-zinc-900/90 border-[#5e6ad2] shadow-lg shadow-[#5e6ad2]/15 ring-1 ring-[#5e6ad2]'
          : 'bg-[#0f1011]/80 hover:bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Competitor Thumbnail */}
        <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center relative">
          {competitor.photo_url ? (
            <img
              src={competitor.photo_url}
              alt={competitor.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <Building2 className="w-5 h-5 text-zinc-600" />
          )}
          {competitor.tracked && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
          )}
        </div>

        {/* Competitor Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
              {competitor.name}
            </h4>
            {competitor.tracked && (
              <span title="Tracked Rival">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
            {formatCategory(competitor.primary_type)}
          </p>
        </div>

        {/* Right Metrics: Distance, Rating, Reviews, Chevron */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          {competitor.distance_km != null && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10.5px] tabular-nums ${
                isNearby
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 bg-zinc-900/60 border border-zinc-800/80'
              }`}
            >
              <MapPin className="w-2.5 h-2.5 text-current shrink-0" />
              <span>{competitor.distance_km}km</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900/70 border border-zinc-800/80 font-mono text-xs tabular-nums">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <span className="font-semibold text-zinc-200">
              {competitor.rating ? competitor.rating.toFixed(1) : '–'}
            </span>
          </div>

          <span className="text-[11px] text-zinc-500 font-mono tabular-nums hidden sm:inline">
            ({competitor.review_count.toLocaleString()})
          </span>

          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </div>
  );
}
