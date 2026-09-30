import { useState } from 'react';
import {
  Star,
  FileText,
  Smile,
  Frown,
  Sparkles,
  Send,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from 'lucide-react';
import {
  MOCK_METRICS,
  MOCK_DAILY_TREND,
  MOCK_THEMES,
  MOCK_SHIFTS,
  MOCK_REVIEWS,
  MOCK_PLATFORMS,
} from '../mock/dashboardData';
import type { PageId } from '../types/dashboard';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
  onAskAiQuery: (query: string) => void;
}

export default function DashboardView({ onNavigate, onAskAiQuery }: DashboardViewProps) {
  const [customQuestion, setCustomQuestion] = useState('');

  const handleAsk = (q: string) => {
    onAskAiQuery(q);
    onNavigate('ask-ai');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: 4 SUMMARY METRIC CARDS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Rating */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-amber-400 border border-[#23252a] flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Average Rating</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {MOCK_METRICS.averageRating}
              </span>
              <span className="text-xs text-[#62666d] font-medium">/ 5</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-400 font-medium">
              <ArrowDown className="w-3 h-3" />
              <span>{Math.abs(MOCK_METRICS.ratingChange)}</span>
              <span className="text-[#62666d] font-normal">vs last week (4.5)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-[#828fff] border border-[#23252a] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#828fff]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Total Reviews</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {MOCK_METRICS.totalReviews}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#4ade80] font-medium">
              <ArrowUp className="w-3 h-3" />
              <span>{MOCK_METRICS.reviewsChangePercent}%</span>
              <span className="text-[#62666d] font-normal">vs last week (194)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Positive Reviews */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-[#4ade80] border border-[#23252a] flex items-center justify-center shrink-0">
            <Smile className="w-4 h-4 text-[#4ade80]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Positive Reviews</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {MOCK_METRICS.positivePercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#4ade80] font-medium">
              <ArrowUp className="w-3 h-3" />
              <span>{MOCK_METRICS.positiveChange}%</span>
              <span className="text-[#62666d] font-normal">vs last week (57%)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Negative Reviews */}
        <div className="bg-[#0f1011] rounded-xl p-5 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-[#141516] text-rose-400 border border-[#23252a] flex items-center justify-center shrink-0">
            <Frown className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#8a8f98] block">Negative Reviews</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f7f8f8] tracking-tight tabular-nums">
                {MOCK_METRICS.negativePercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-400 font-medium">
              <ArrowUp className="w-3 h-3" />
              <span>{MOCK_METRICS.negativeChange}%</span>
              <span className="text-[#62666d] font-normal">vs last week (11%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: REVIEW TREND CHART (65%) & AI REPUTATION ASSISTANT (35%)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Review Trend Chart */}
        <div className="lg:col-span-8 bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">Review Volume & Sentiment</h2>
              <p className="text-xs text-[#8a8f98] mt-0.5">Aggregated feedback distribution with star rating trajectory</p>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-[#8a8f98]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#27a644]" /> Positive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#34343a]" /> Neutral
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#f43f5e]" /> Negative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#5e6ad2] relative flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#828fff] absolute" />
                </span>{' '}
                Avg Rating
              </span>
            </div>
          </div>

          {/* SVG Stacked Bar Chart with Line Overlay */}
          <div className="relative w-full h-56 pt-2">
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="40" y1="20" x2="560" y2="20" stroke="#1c1d21" strokeDasharray="3 3" />
              <line x1="40" y1="65" x2="560" y2="65" stroke="#1c1d21" strokeDasharray="3 3" />
              <line x1="40" y1="110" x2="560" y2="110" stroke="#1c1d21" strokeDasharray="3 3" />
              <line x1="40" y1="155" x2="560" y2="155" stroke="#23252a" />

              {/* Y Axis Labels (Left: Count 0-80) */}
              <text x="30" y="24" fontSize="10" fill="#62666d" textAnchor="end">80</text>
              <text x="30" y="69" fontSize="10" fill="#62666d" textAnchor="end">60</text>
              <text x="30" y="114" fontSize="10" fill="#62666d" textAnchor="end">40</text>
              <text x="30" y="158" fontSize="10" fill="#62666d" textAnchor="end">0</text>

              {/* Y Axis Labels (Right: Rating 2-5) */}
              <text x="570" y="24" fontSize="10" fill="#62666d">5</text>
              <text x="570" y="69" fontSize="10" fill="#62666d">4</text>
              <text x="570" y="114" fontSize="10" fill="#62666d">3</text>
              <text x="570" y="158" fontSize="10" fill="#62666d">2</text>

              {/* Daily Stacked Bars */}
              {MOCK_DAILY_TREND.map((d, i) => {
                const x = 70 + i * 70;
                const barWidth = 22;
                const posH = d.positive * 1.5;
                const neuH = d.neutral * 1.5;
                const negH = d.negative * 1.5;

                const posBase = 155 - posH;
                const neuBase = posBase - neuH;
                const negBase = neuBase - negH;

                return (
                  <g key={d.day}>
                    {/* Positive segment (bottom) */}
                    <rect
                      x={x - barWidth / 2}
                      y={posBase}
                      width={barWidth}
                      height={posH}
                      fill="#27a644"
                      rx="2"
                    />
                    {/* Neutral segment (middle) */}
                    <rect
                      x={x - barWidth / 2}
                      y={neuBase}
                      width={barWidth}
                      height={neuH}
                      fill="#2e3037"
                      rx="1"
                    />
                    {/* Negative segment (top) */}
                    <rect
                      x={x - barWidth / 2}
                      y={negBase}
                      width={barWidth}
                      height={negH}
                      fill="#f43f5e"
                      rx="2"
                    />
                    {/* X axis date label */}
                    <text
                      x={x}
                      y="175"
                      fontSize="11"
                      fill="#8a8f98"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}

              {/* Rating Line Overlay */}
              <polyline
                fill="none"
                stroke="#5e6ad2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={MOCK_DAILY_TREND.map((d, i) => {
                  const x = 70 + i * 70;
                  const y = 155 - ((d.avgRating - 2) / 3) * 135;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Rating Dots */}
              {MOCK_DAILY_TREND.map((d, i) => {
                const x = 70 + i * 70;
                const y = 155 - ((d.avgRating - 2) / 3) * 135;
                return (
                  <circle
                    key={`dot-${d.day}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#5e6ad2"
                    stroke="#0f1011"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: AI Reputation Assistant */}
        <div className="lg:col-span-4 bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#828fff]" />
              <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
                AI Reputation Assistant
              </h2>
            </div>
            <p className="text-xs text-[#8a8f98] mb-4">
              Query reviews, pinpoint anomalies, and evaluate operational feedback.
            </p>

            {/* Quick question pill prompts */}
            <div className="space-y-2">
              {[
                'Why did our rating drop this week?',
                'What are customers complaining about the most?',
                'Show recent negative reviews about staff',
                'Compare this week with last week',
                'Summarize this week for me',
              ].map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => handleAsk(query)}
                  className="w-full text-left px-3 py-2 rounded-md bg-[#141516] hover:bg-[#18191a] border border-[#23252a] hover:border-[#34343a] text-xs text-[#d0d6e0] hover:text-[#f7f8f8] font-medium transition-colors truncate"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customQuestion.trim()) {
                handleAsk(customQuestion);
              }
            }}
            className="mt-4 pt-3.5 border-t border-[#23252a] flex items-center gap-2"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask anything about review patterns…"
              className="flex-1 h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-md bg-[#5e6ad2] text-white flex items-center justify-center hover:bg-[#828fff] transition-colors shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              aria-label="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: SENTIMENT BREAKDOWN, TOP THEMES & WHAT CHANGED
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Sentiment Breakdown (Donut Chart) */}
        <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight mb-4">
            Sentiment Breakdown
          </h2>

          <div className="flex items-center gap-6">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#18191a" strokeWidth="12" fill="none" />
                {/* Positive Segment (62% = 148 length out of 238.76 perimeter) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#27a644"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="148 239"
                  strokeDashoffset="0"
                />
                {/* Neutral Segment (20% = 48 length) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#2e3037"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="48 239"
                  strokeDashoffset="-148"
                />
                {/* Negative Segment (18% = 43 length) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f43f5e"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="43 239"
                  strokeDashoffset="-196"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-semibold text-[#f7f8f8] leading-tight tabular-nums">248</span>
                <span className="text-[10px] text-[#62666d] font-medium">Total Reviews</span>
              </div>
            </div>

            {/* Distribution Legend */}
            <div className="space-y-3 text-xs w-full">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#d0d6e0]">
                  <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                  Positive <strong className="text-[#f7f8f8]">62%</strong> <span className="text-[#62666d] font-normal">(154)</span>
                </span>
                <span className="text-[#4ade80] font-medium flex items-center text-[11px]">
                  <ArrowUp className="w-3 h-3" /> 5%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#d0d6e0]">
                  <span className="w-2 h-2 rounded-full bg-[#34343a]" />
                  Neutral <strong className="text-[#f7f8f8]">20%</strong> <span className="text-[#62666d] font-normal">(50)</span>
                </span>
                <span className="text-rose-400 font-medium flex items-center text-[11px]">
                  <ArrowDown className="w-3 h-3" /> 2%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#d0d6e0]">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                  Negative <strong className="text-[#f7f8f8]">18%</strong> <span className="text-[#62666d] font-normal">(44)</span>
                </span>
                <span className="text-rose-400 font-medium flex items-center text-[11px]">
                  <ArrowUp className="w-3 h-3" /> 7%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top Themes */}
        <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">Top Themes</h2>
            <button
              type="button"
              onClick={() => onNavigate('themes')}
              className="text-xs font-medium text-[#828fff] hover:text-[#f7f8f8] transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {MOCK_THEMES.map((theme, idx) => {
              const barColors = ['#f43f5e', '#f59e0b', '#5e6ad2', '#7a7fad', '#27a644'];
              return (
                <div key={theme.name} className="flex items-center gap-3">
                  <span className="w-28 text-[#d0d6e0] font-medium truncate">{theme.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#18191a] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(theme.count / 48) * 100}%`,
                        backgroundColor: barColors[idx % barColors.length],
                      }}
                    />
                  </div>
                  <span className="w-6 text-[#f7f8f8] font-medium text-right tabular-nums">
                    {theme.count}
                  </span>
                  <span
                    className={`w-12 text-right font-medium flex items-center justify-end text-[11px] ${
                      theme.isIncrease ? 'text-rose-400' : 'text-[#4ade80]'
                    }`}
                  >
                    {theme.isIncrease ? (
                      <ArrowUp className="w-3 h-3 inline mr-0.5" />
                    ) : (
                      <ArrowDown className="w-3 h-3 inline mr-0.5" />
                    )}
                    {theme.changePercent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: What Changed This Week? */}
        <div className="bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
              What Changed This Week?
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-[#828fff] hover:text-[#f7f8f8] transition-colors"
            >
              View Details
            </button>
          </div>

          <div className="space-y-2.5">
            {MOCK_SHIFTS.map((shift) => (
              <div
                key={shift.id}
                className="p-3 rounded-lg border border-[#23252a] bg-[#141516] flex items-start gap-3 hover:border-[#34343a] transition-colors"
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-medium ${
                    shift.color === 'rose'
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                      : shift.color === 'emerald'
                      ? 'bg-[#27a644]/15 text-[#4ade80] border border-[#27a644]/30'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                  }`}
                >
                  {shift.direction === 'up' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </span>
                <div>
                  <h3 className="text-xs font-medium text-[#f7f8f8]">{shift.title}</h3>
                  <p className="text-[11px] text-[#8a8f98] mt-0.5 leading-snug">{shift.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 4: RECENT REVIEWS & REVIEWS BY PLATFORM
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Reviews (8 cols) */}
        <div className="lg:col-span-8 bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">Recent Reviews</h2>
            <button
              type="button"
              onClick={() => onNavigate('reviews')}
              className="text-xs font-medium text-[#828fff] hover:text-[#f7f8f8] transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {MOCK_REVIEWS.slice(0, 3).map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-all flex items-start gap-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]"
              >
                {/* Platform Icon circle */}
                <div className="shrink-0 pt-0.5">
                  {rev.platform === 'google' ? (
                    <span className="w-6 h-6 rounded-md bg-red-950/40 text-red-400 font-bold text-xs flex items-center justify-center border border-red-900/30">
                      G
                    </span>
                  ) : rev.platform === 'instagram' ? (
                    <span className="w-6 h-6 rounded-md bg-pink-950/40 text-pink-400 font-bold text-[10px] flex items-center justify-center border border-pink-900/30">
                      IG
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-md bg-blue-950/40 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-900/30">
                      in
                    </span>
                  )}
                </div>

                {/* Review Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#f7f8f8]">{rev.author}</span>
                    <button type="button" className="text-[#62666d] hover:text-[#8a8f98]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <div className="flex text-amber-400">
                      {'★'.repeat(rev.rating)}
                      <span className="text-[#23252a]">{'★'.repeat(5 - rev.rating)}</span>
                    </div>
                    <span className="text-[11px] text-[#62666d] font-normal">{rev.date}</span>
                  </div>

                  <p className="text-xs text-[#d0d6e0] leading-relaxed mt-1.5">{rev.content}</p>

                  {/* Themes Pill list */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {rev.themes.map((theme) => (
                      <span
                        key={theme}
                        className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#18191a] text-[#8a8f98] border border-[#23252a]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Reviews by Platform (4 cols) */}
        <div className="lg:col-span-4 bg-[#0f1011] rounded-xl p-6 border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
              Reviews by Platform
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-xs font-medium text-[#828fff] hover:text-[#f7f8f8] transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {MOCK_PLATFORMS.map((plat) => (
              <div key={plat.platform} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#d0d6e0]">
                  <div className="flex items-center gap-2">
                    {plat.platform === 'google' ? (
                      <span className="w-5 h-5 rounded bg-red-950/40 text-red-400 font-bold text-[10px] flex items-center justify-center border border-red-900/30">
                        G
                      </span>
                    ) : plat.platform === 'instagram' ? (
                      <span className="w-5 h-5 rounded bg-pink-950/40 text-pink-400 font-bold text-[9px] flex items-center justify-center border border-pink-900/30">
                        IG
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded bg-blue-950/40 text-blue-400 font-bold text-[10px] flex items-center justify-center border border-blue-900/30">
                        in
                      </span>
                    )}
                    <span>{plat.name}</span>
                  </div>
                  <span className="font-semibold text-[#f7f8f8] tabular-nums">
                    {plat.platform === 'google' ? 184 : plat.platform === 'instagram' ? 42 : 22}
                  </span>
                </div>

                {/* Horizontal Segmented Progress Bar */}
                <div className="h-2 rounded-full bg-[#18191a] overflow-hidden flex">
                  <div
                    style={{ width: `${plat.sentiment.positive}%` }}
                    className="bg-[#27a644] h-full"
                    title={`Positive: ${plat.sentiment.positive}%`}
                  />
                  <div
                    style={{ width: `${plat.sentiment.neutral}%` }}
                    className="bg-[#2e3037] h-full"
                    title={`Neutral: ${plat.sentiment.neutral}%`}
                  />
                  <div
                    style={{ width: `${plat.sentiment.negative}%` }}
                    className="bg-[#f43f5e] h-full"
                    title={`Negative: ${plat.sentiment.negative}%`}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#62666d] font-medium px-0.5">
                  <span className="text-[#4ade80]">{plat.sentiment.positive}% pos</span>
                  <span>{plat.sentiment.neutral}% neu</span>
                  <span className="text-rose-400">{plat.sentiment.negative}% neg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
