import Skeleton from '../ui/Skeleton';

export default function DashboardSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans"
      aria-busy="true"
      aria-label="Loading dashboard telemetry"
    >
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: TELEMETRY GRID SKELETON (4 METRICS)
          ───────────────────────────────────────────────────────────── */}
      <div className="border border-[#262626] rounded-2xl bg-[#171717] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#262626]">
        {/* Metric 1: Average Rating */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-2.5 h-2.5 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-18" />
            <Skeleton className="h-3.5 w-8" />
          </div>
          <div className="pt-1">
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>

        {/* Metric 2: Total Feedback */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="w-3.5 h-3.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <div className="pt-1">
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>

        {/* Metric 3: Positive Sentiment */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <div className="w-2 h-2 rounded-full bg-[#22c55e]/30 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          <div className="pt-1">
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>

        {/* Metric 4: Critical Feedback */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-26" />
            <div className="w-2 h-2 rounded-full bg-rose-500/30 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          <div className="pt-1">
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: COMMAND QUERY STRIP SKELETON
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#262626] bg-[#171717] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 h-9 bg-[#1f1f1f] border border-[#262626] rounded-full flex items-center px-4 gap-2.5">
            <Skeleton className="w-4 h-4 rounded-full shrink-0" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full shrink-0" />
        </div>

        <div className="flex items-center gap-2 overflow-hidden pt-0.5">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-6 w-48 rounded-full shrink-0" />
          <Skeleton className="h-6 w-56 rounded-full shrink-0" />
          <Skeleton className="h-6 w-52 rounded-full shrink-0" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2.5: CHARTS SKELETON (TREND & DISTRIBUTION)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Review Trend Chart Skeleton */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-[#262626] bg-[#171717] p-6 flex flex-col justify-between space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#262626]">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-56" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]/30 animate-pulse" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80]/30 animate-pulse" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500/30 animate-pulse" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>

          {/* Chart Visual Simulation Area */}
          <div className="relative h-56 w-full flex flex-col justify-between py-2">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 w-full">
                  <Skeleton className="h-2 w-6 shrink-0" />
                  <div className="h-[1px] w-full border-b border-[#262626] border-dashed" />
                </div>
              ))}
            </div>

            {/* Simulated Animated Trend Wave / Bars */}
            <div className="relative h-44 w-full flex items-end justify-between px-10 pt-4 z-10">
              {[45, 62, 50, 78, 65, 84, 92, 75].map((heightPct, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 max-w-[40px] px-1">
                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      className="w-full bg-[#1f1f1f] rounded-t-sm skeleton-shimmer animate-pulse"
                      style={{
                        height: `${heightPct}%`,
                        animationDelay: `${idx * 120}ms`,
                      }}
                    />
                  </div>
                  <Skeleton className="h-2 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Rating Distribution Chart Skeleton */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-[#262626] bg-[#171717] p-6 flex flex-col justify-between space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2.5 w-44" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Donut & Breakdown Content */}
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* Donut Placeholder */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-8 border-[#262626] skeleton-shimmer animate-pulse flex flex-col items-center justify-center">
                <Skeleton className="h-5 w-12 mb-1" />
                <Skeleton className="h-2 w-10" />
              </div>
            </div>

            {/* 5 Star Breakdown Rows */}
            <div className="flex-1 w-full space-y-3">
              {[
                { star: 5, width: '75%' },
                { star: 4, width: '45%' },
                { star: 3, width: '20%' },
                { star: 2, width: '10%' },
                { star: 1, width: '5%' },
              ].map((row) => (
                <div key={row.star} className="flex items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-1 w-9 shrink-0">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="w-4 h-3" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[#1f1f1f] border border-[#262626] overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-[#404040] skeleton-shimmer animate-pulse"
                      style={{ width: row.width }}
                    />
                  </div>
                  <Skeleton className="h-3 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Skeleton */}
          <div className="pt-3.5 border-t border-[#262626] flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: THEMES & DETECTED TELEMETRY SHIFTS SKELETON
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Topic Clusters Skeleton */}
        <div className="rounded-2xl border border-[#262626] bg-[#171717] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-52" />
            </div>
            <Skeleton className="h-3 w-18" />
          </div>

          <div className="space-y-4 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="h-1.5 w-full bg-[#1f1f1f] rounded-full overflow-hidden flex border border-[#262626]">
                  <div className="w-3/5 bg-[#22c55e]/40 skeleton-shimmer animate-pulse h-full" />
                  <div className="w-1/5 bg-[#404040] h-full" />
                  <div className="w-1/5 bg-rose-500/40 h-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Telemetry Shifts Skeleton */}
        <div className="rounded-2xl border border-[#262626] bg-[#171717] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>

          <div className="space-y-3 pt-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#1f1f1f] border border-[#262626] flex items-start justify-between gap-3"
              >
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-2.5 w-56" />
                </div>
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: INGESTED FEEDBACK STREAM SKELETON
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#262626] bg-[#171717] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-2.5 w-56" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>

        <div className="divide-y divide-[#262626]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2 flex-1 min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-3.5 w-28" />
                  <span className="text-[#404040]">/</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, starIdx) => (
                      <Skeleton key={starIdx} className="w-2.5 h-2.5 rounded-full" />
                    ))}
                  </div>
                  <span className="text-[#404040]">/</span>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full shrink-0 self-start" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
