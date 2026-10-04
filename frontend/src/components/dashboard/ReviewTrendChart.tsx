import { useState, useMemo, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReviewItem } from '../../types/dashboard';

interface ReviewTrendChartProps {
  reviews: ReviewItem[];
  className?: string;
}

type TimeRange = '7d' | '30d' | '90d' | '12m' | 'all';

interface TrendPoint {
  date: string;
  fullDate: string;
  timestamp: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export default function ReviewTrendChart({ reviews, className = '' }: ReviewTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rangeLabels: Record<TimeRange, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '12m': 'Last 12 months',
    'all': 'All time',
  };

  // Group reviews into trend intervals
  const trendData = useMemo<TrendPoint[]>(() => {
    if (!reviews || reviews.length === 0) {
      return [];
    }

    const valid = reviews
      .map((r) => {
        const rawDate = r.publishedAt || (r.date && r.date !== 'Recent' ? r.date : null);
        const parsed = rawDate ? new Date(rawDate) : null;
        return {
          ...r,
          dateObj: parsed && !isNaN(parsed.getTime()) ? parsed : null,
        };
      })
      .filter((r): r is typeof r & { dateObj: Date } => r.dateObj !== null)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (valid.length === 0) return [];

    const now = new Date();
    const latestDate = valid[valid.length - 1].dateObj;
    const endDate = latestDate.getTime() > now.getTime() ? latestDate : now;
    let startDate: Date;
    let bucketCount = 7;
    let formatLabel: (d: Date) => string;
    let formatFullLabel: (d: Date) => string;

    if (timeRange === '7d') {
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      bucketCount = 7;
      formatLabel = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
      formatFullLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (timeRange === '30d') {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      bucketCount = 7;
      formatLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      formatFullLabel = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (timeRange === '90d') {
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      bucketCount = 7;
      formatLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      formatFullLabel = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (timeRange === '12m') {
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      bucketCount = 8;
      formatLabel = (d) => d.toLocaleDateString('en-US', { month: 'short' });
      formatFullLabel = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      startDate = valid[0].dateObj;
      bucketCount = 8;
      formatLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      formatFullLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    const rangeMs = endDate.getTime() - startDate.getTime();
    const stepMs = Math.max(1, rangeMs / (bucketCount - 1));

    const result: TrendPoint[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketCenter = new Date(startDate.getTime() + i * stepMs);
      const bucketStart = new Date(bucketCenter.getTime() - stepMs / 2);
      const bucketEnd = new Date(bucketCenter.getTime() + stepMs / 2);

      const inBucket = valid.filter(
        (r) =>
          r.dateObj >= bucketStart &&
          (i === bucketCount - 1 ? r.dateObj <= new Date(bucketEnd.getTime() + 86400000) : r.dateObj < bucketEnd)
      );

      const positive = inBucket.filter((r) => r.sentiment === 'positive').length;
      const neutral = inBucket.filter((r) => r.sentiment === 'neutral').length;
      const negative = inBucket.filter((r) => r.sentiment === 'negative').length;

      result.push({
        date: formatLabel(bucketCenter),
        fullDate: formatFullLabel(bucketCenter),
        timestamp: bucketCenter.getTime(),
        positive,
        neutral,
        negative,
        total: inBucket.length,
      });
    }

    return result;
  }, [reviews, timeRange]);

  // Dimensions for SVG viewport
  const width = 640;
  const height = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate Y-axis scaling
  const maxVal = useMemo(() => {
    let m = 0;
    for (const p of trendData) {
      m = Math.max(m, p.positive, p.neutral, p.negative);
    }
    if (m === 0) return 10;
    if (m <= 5) return 5;
    if (m <= 10) return 10;
    if (m <= 25) return 25;
    if (m <= 50) return 50;
    if (m <= 100) return 100;
    return Math.ceil(m / 20) * 20;
  }, [trendData]);

  // Compute (x, y) coordinates for each series
  const points = useMemo(() => {
    const len = trendData.length;
    const stepX = len > 1 ? chartW / (len - 1) : chartW;

    return {
      positive: trendData.map((d, i) => ({
        x: padLeft + i * stepX,
        y: padTop + chartH - (d.positive / maxVal) * chartH,
        val: d.positive,
      })),
      neutral: trendData.map((d, i) => ({
        x: padLeft + i * stepX,
        y: padTop + chartH - (d.neutral / maxVal) * chartH,
        val: d.neutral,
      })),
      negative: trendData.map((d, i) => ({
        x: padLeft + i * stepX,
        y: padTop + chartH - (d.negative / maxVal) * chartH,
        val: d.negative,
      })),
    };
  }, [trendData, chartW, chartH, padLeft, padTop, maxVal]);

  // Generate cubic Bézier spline path from points
  const makeSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    const tension = 0.2;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const posPath = makeSmoothPath(points.positive);
  const neuPath = makeSmoothPath(points.neutral);
  const negPath = makeSmoothPath(points.negative);

  // Area path for positive
  const posArea = posPath
    ? `${posPath} L ${points.positive[points.positive.length - 1].x} ${padTop + chartH} L ${points.positive[0].x} ${padTop + chartH} Z`
    : '';

  // Y-axis grid tick values (4 steps)
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  // Mouse hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    
    // Find closest data point
    let closestIdx = 0;
    let minDist = Infinity;
    points.positive.forEach((pt, i) => {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredData = hoveredIndex !== null ? trendData[hoveredIndex] : null;
  const hoveredPos = hoveredIndex !== null ? points.positive[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col justify-between ${className}`}
    >
      {/* Chart Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Review Trend</h3>
          <p className="text-[11px] font-mono text-zinc-500">Sentiment trajectory over evaluation window</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-300 text-[11px]">Positive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-zinc-400 text-[11px]">Neutral</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-zinc-400 text-[11px]">Negative</span>
            </div>
          </div>

          {/* Time Filter Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
            >
              <span>{rangeLabels[timeRange]}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-36 rounded-md bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-30 font-mono text-xs divide-y divide-zinc-800/60">
                  {(Object.keys(rangeLabels) as TimeRange[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTimeRange(key);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 transition-colors flex items-center justify-between cursor-pointer ${
                        timeRange === key ? 'text-zinc-100 font-medium bg-zinc-800/40' : 'text-zinc-400'
                      }`}
                    >
                      <span>{rangeLabels[key]}</span>
                      {timeRange === key && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Body: Real-time SVG Canvas or Zero State */}
      {trendData.length === 0 ? (
        <div className="py-16 text-center space-y-1.5 font-mono">
          <p className="text-xs text-zinc-400 font-medium">No review telemetry recorded for this timeframe</p>
          <p className="text-[11px] text-zinc-600">Sync live customer feedback in Settings to inspect trends</p>
        </div>
      ) : (
        <div className="relative pt-4 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Soft Emerald Area Gradient */}
            <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>

            {/* Soft Neutral Gradient */}
            <linearGradient id="neutralAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Hairline Grid Lines & Y Ticks */}
          {yTicks.map((val, i) => {
            const y = padTop + chartH - (val / maxVal) * chartH;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? 'none' : '4 4'}
                />
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-zinc-500 font-mono text-[10px]"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {trendData.map((d, i) => {
            const x = padLeft + (points.positive[i]?.x ? points.positive[i].x - padLeft : 0);
            return (
              <text
                key={i}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-zinc-400 font-mono text-[11px]"
              >
                {d.date}
              </text>
            );
          })}

          {/* Gradient Area Fill (Positive series) */}
          {posArea && (
            <path
              d={posArea}
              fill="url(#emeraldAreaGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Active Vertical Hairline tracking on Hover */}
          {hoveredPos && (
            <line
              x1={hoveredPos.x}
              y1={padTop}
              x2={hoveredPos.x}
              y2={padTop + chartH}
              stroke="#52525b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Neutral Path */}
          {neuPath && (
            <path
              d={neuPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Negative Path */}
          {negPath && (
            <path
              d={negPath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Positive Path */}
          {posPath && (
            <path
              d={posPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Neutral Points */}
          {points.neutral.map((pt, i) => (
            <circle
              key={`neu-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5 : 3.5}
              fill="#818cf8"
              stroke="#09090b"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          ))}

          {/* Negative Points */}
          {points.negative.map((pt, i) => (
            <circle
              key={`neg-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5 : 3.5}
              fill="#f43f5e"
              stroke="#09090b"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          ))}

          {/* Positive Points */}
          {points.positive.map((pt, i) => (
            <circle
              key={`pos-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5.5 : 4}
              fill="#10b981"
              stroke="#09090b"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          ))}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredData && hoveredPos && (
          <div
            className={`absolute z-10 pointer-events-none rounded-md bg-zinc-900/95 border border-zinc-700/80 px-3 py-2 shadow-2xl backdrop-blur-sm text-xs font-mono space-y-1.5 transition-all duration-75 ${
              (hoveredPos.x / width) * 100 < 20
                ? 'translate-x-0'
                : (hoveredPos.x / width) * 100 > 80
                ? '-translate-x-full'
                : '-translate-x-1/2'
            }`}
            style={{
              left: `${Math.min(95, Math.max(5, (hoveredPos.x / width) * 100))}%`,
              top: '8px',
            }}
          >
            <div className="text-[11px] font-medium text-zinc-200 border-b border-zinc-800 pb-1">
              {hoveredData.fullDate}
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Positive:
                </span>
                <span className="text-emerald-400 font-semibold">{hoveredData.positive}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Neutral:
                </span>
                <span className="text-indigo-300 font-semibold">{hoveredData.neutral}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Negative:
                </span>
                <span className="text-rose-400 font-semibold">{hoveredData.negative}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
