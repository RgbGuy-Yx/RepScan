import { useState, useMemo } from 'react';
import { Star } from 'lucide-react';
import type { ReviewItem } from '../../types/dashboard';

interface RatingDistributionChartProps {
  distribution?: Record<string, number>;
  reviews?: ReviewItem[];
  totalReviews?: number;
  className?: string;
}

interface StarRow {
  star: number;
  label: string;
  count: number;
  percentage: number;
  color: string;
  barBg: string;
}

export default function RatingDistributionChart({
  distribution,
  reviews = [],
  totalReviews,
  className = '',
}: RatingDistributionChartProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Compute breakdown counts directly from live review records
  const { starRows, totalCount } = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (reviews && reviews.length > 0) {
      // Prioritize live review data
      for (const r of reviews) {
        const ratingNum = Math.round(Number(r.rating) || 0);
        if (ratingNum >= 1 && ratingNum <= 5) {
          counts[ratingNum]++;
        }
      }
    } else if (distribution && Object.keys(distribution).length > 0) {
      for (let s = 1; s <= 5; s++) {
        counts[s] = Number(distribution[String(s)] || distribution[s] || 0);
      }
    }

    const calculatedTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    const total = calculatedTotal > 0 ? calculatedTotal : (totalReviews || 0);

    const colors: Record<number, { color: string; barBg: string }> = {
      5: { color: '#10b981', barBg: 'bg-emerald-500' }, // emerald
      4: { color: '#84cc16', barBg: 'bg-lime-500' },    // lime
      3: { color: '#eab308', barBg: 'bg-amber-500' },   // amber
      2: { color: '#f97316', barBg: 'bg-orange-500' },  // orange
      1: { color: '#f43f5e', barBg: 'bg-rose-500' },    // rose
    };

    const rows: StarRow[] = [5, 4, 3, 2, 1].map((s) => {
      const c = counts[s];
      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
      return {
        star: s,
        label: `${s}`,
        count: c,
        percentage: pct,
        color: colors[s].color,
        barBg: colors[s].barBg,
      };
    });

    return { starRows: rows, totalCount: total };
  }, [distribution, reviews, totalReviews]);

  // Donut chart arc calculations
  // Radius R = 50, center = (65, 65), circumference = 2 * PI * 50 = 314.159
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;

  // Compute donut segment stroke-dasharray and offsets
  const donutSegments = useMemo(() => {
    let accumulatedOffset = 0;
    const nonZeroRows = starRows.filter((r) => r.count > 0);
    const gap = nonZeroRows.length > 1 ? 4 : 0;

    return starRows.map((row) => {
      if (totalCount === 0 || row.count === 0) {
        return { ...row, strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 };
      }

      const sliceLength = (row.count / totalCount) * circumference;
      const visibleLength = Math.max(1, sliceLength - gap);
      const dasharray = `${visibleLength} ${circumference - visibleLength}`;
      const offset = -accumulatedOffset;

      accumulatedOffset += sliceLength;

      return {
        ...row,
        strokeDasharray: dasharray,
        strokeDashoffset: offset,
      };
    });
  }, [starRows, totalCount, circumference]);

  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Rating Distribution</h3>
          <p className="text-[11px] font-mono text-zinc-500">Volume distribution across 1 to 5 star scores</p>
        </div>
      </div>

      {/* Main Content: Donut on Left, Progress Breakdown on Right */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
        {/* Left: Donut Chart with Centered Total */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width="140"
            height="140"
            viewBox="0 0 130 130"
            className="transform -rotate-90 select-none overflow-visible"
          >
            {/* Background ring */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {donutSegments.map((segment) => {
              const isHovered = hoveredStar === segment.star;
              return (
                <circle
                  key={segment.star}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredStar(segment.star)}
                  onMouseLeave={() => setHoveredStar(null)}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Reviews
            </span>
          </div>
        </div>

        {/* Right: Star Rows Breakdown */}
        <div className="flex-1 w-full space-y-2.5">
          {starRows.map((row) => {
            const isHovered = hoveredStar === row.star;
            return (
              <div
                key={row.star}
                onMouseEnter={() => setHoveredStar(row.star)}
                onMouseLeave={() => setHoveredStar(null)}
                className={`flex items-center gap-3 text-xs transition-colors rounded-md p-1 -m-1 cursor-pointer ${
                  isHovered ? 'bg-zinc-900/60' : ''
                }`}
              >
                {/* Star Badge */}
                <div className="flex items-center gap-1.5 w-9 shrink-0 font-mono">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 transition-transform"
                    style={{
                      backgroundColor: row.color,
                      transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                  <span className="text-zinc-200 font-medium text-xs">{row.star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                </div>

                {/* Horizontal Progress Track */}
                <div className="flex-1 h-2 rounded-full bg-zinc-900/90 border border-zinc-800/80 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${row.percentage}%`,
                      backgroundColor: row.color,
                      opacity: hoveredStar !== null && hoveredStar !== row.star ? 0.4 : 1,
                    }}
                  />
                </div>

                {/* Count & Percentage */}
                <div className="w-20 text-right shrink-0 font-mono text-[11px] tabular-nums">
                  <span className="text-zinc-200 font-medium">{row.count}</span>
                  <span className="text-zinc-500 ml-1.5 font-normal">({row.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
