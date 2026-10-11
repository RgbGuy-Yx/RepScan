import { useState, useEffect, useMemo } from 'react';
import type { CompetitorItem, CompetitorComparisonData, TrackedCompetitor } from '../../api/competitorApi';
import { competitorApi } from '../../api/competitorApi';
import { fetchCompetitorDetails, type DetailedCompetitorData } from '../../services/googleMapsService';
import InstagramIntegrationSection from '../instagram/InstagramIntegrationSection';
import {
  MapPin,
  Globe,
  Star,
  BookmarkCheck,
  BookmarkPlus,
  RefreshCw,
  Loader2,
  TrendingUp,
  Smile,
  Frown,
  CheckCircle2,
  MessageSquare,
  User,
  ArrowUpRight,
} from 'lucide-react';

interface CompetitorDetailPanelProps {
  businessId: string;
  businessName?: string;
  businessLocation?: { lat: number; lng: number } | null;
  competitor: CompetitorItem;
  trackedCompetitors: TrackedCompetitor[];
  onTrackToggle: (placeId: string, isTracked: boolean) => Promise<void>;
  onClose?: () => void;
}

type TabType =
  | 'overview'
  | 'reviews'
  | 'sentiment'
  | 'themes'
  | 'comparison'
  | 'feedback'
  | 'instagram';

export default function CompetitorDetailPanel({
  businessId,
  businessName = 'Your Business',
  businessLocation,
  competitor,
  trackedCompetitors,
  onTrackToggle,
}: CompetitorDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [details, setDetails] = useState<DetailedCompetitorData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [comparison, setComparison] = useState<CompetitorComparisonData | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [isTrackingAction, setIsTrackingAction] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check if competitor is tracked in PostgreSQL
  const trackedRecord = trackedCompetitors.find(
    (tc) => tc.google_place_id === competitor.place_id && tc.tracked
  );
  const isTracked = Boolean(trackedRecord);

  // 1. Fetch Google Place Details
  useEffect(() => {
    let isCancelled = false;

    async function loadDetails() {
      setIsLoadingDetails(true);
      try {
        const data = await fetchCompetitorDetails(competitor.place_id, businessLocation);
        if (!isCancelled) {
          setDetails(data);
        }
      } catch (err) {
        console.warn('Failed to fetch Google Place details:', err);
      } finally {
        if (!isCancelled) setIsLoadingDetails(false);
      }
    }

    loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [competitor.place_id, businessLocation]);

  // 2. Fetch Realtime Comparison Data
  useEffect(() => {
    let isCancelled = false;

    async function loadComparison() {
      setIsLoadingComparison(true);
      try {
        const targetId = trackedRecord?.id || competitor.place_id;
        const compData = await competitorApi.getComparison(businessId, targetId);
        if (!isCancelled) {
          setComparison(compData);
        }
      } catch (err) {
        console.warn('Failed to load comparison data:', err);
      } finally {
        if (!isCancelled) setIsLoadingComparison(false);
      }
    }

    loadComparison();

    return () => {
      isCancelled = true;
    };
  }, [businessId, trackedRecord, competitor.place_id]);

  const handleTrackClick = async () => {
    setIsTrackingAction(true);
    try {
      await onTrackToggle(competitor.place_id, isTracked);
    } finally {
      setIsTrackingAction(false);
    }
  };

  const handleSyncClick = async () => {
    if (!trackedRecord) return;
    setIsSyncing(true);
    try {
      await competitorApi.syncCompetitor(businessId, trackedRecord.id);
      const fresh = await fetchCompetitorDetails(competitor.place_id, businessLocation);
      setDetails(fresh);
    } catch (err) {
      console.error('Failed to sync competitor:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCategory = (type?: string | null) => {
    if (!type) return 'Competitor';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const rating = details?.rating ?? competitor.rating ?? null;
  const reviewCount = details?.review_count ?? competitor.review_count ?? 0;
  const website = details?.website ?? competitor.website;
  const address = details?.address ?? competitor.address;
  const googleMapsUrl = details?.google_maps_url ?? competitor.google_maps_url;
  const distanceKm = details?.distance_km ?? competitor.distance_km;
  const photoUrl = details?.photo_url ?? competitor.photo_url;
  const photoAttributions = details?.photo_attributions ?? competitor.photo_attributions;

  // Realtime comparison metrics (Zero hardcoding)
  const bizRating = comparison?.business?.rating ?? null;
  const bizReviewCount = comparison?.business?.review_count ?? 0;
  const bizPositive = comparison?.business?.positive_sentiment ?? null;
  const bizNeutral = comparison?.business?.neutral_sentiment ?? null;
  const bizNegative = comparison?.business?.negative_sentiment ?? null;
  const bizGrowth = comparison?.business?.review_growth ?? null;

  const compPositive = comparison?.competitor?.positive_sentiment ?? null;
  const compNeutral = comparison?.competitor?.neutral_sentiment ?? null;
  const compNegative = comparison?.competitor?.negative_sentiment ?? null;
  const compGrowth = comparison?.competitor?.review_growth ?? null;
  const compDelta = comparison?.competitor?.rating_delta ?? null;

  // Trend data
  const ratingTrendBiz = comparison?.business?.rating_trend || [];
  const ratingTrendComp = comparison?.competitor?.rating_trend || [];

  // Dynamic extraction of themes from verified Google customer reviews
  const dynamicThemes = useMemo(() => {
    const reviews = details?.reviews || [];
    if (!reviews || reviews.length === 0) return [];

    const TOPIC_PATTERNS = [
      { id: 'service', label: 'Customer Service & Staff', keywords: ['staff', 'service', 'team', 'helpful', 'friendly', 'rude', 'behaviour', 'reception', 'polite'] },
      { id: 'quality', label: 'Quality & Experience', keywords: ['quality', 'result', 'effective', 'treatment', 'work', 'outcome', 'expert', 'doctor', 'professional', 'food', 'taste', 'ambience'] },
      { id: 'cleanliness', label: 'Atmosphere & Cleanliness', keywords: ['clean', 'hygiene', 'ambience', 'atmosphere', 'environment', 'facility', 'modern'] },
      { id: 'pricing', label: 'Pricing & Value', keywords: ['price', 'cost', 'expensive', 'affordable', 'value', 'money', 'charge', 'package'] },
      { id: 'speed', label: 'Wait Times & Scheduling', keywords: ['wait', 'time', 'appointment', 'fast', 'quick', 'delay', 'schedule', 'queue'] },
      { id: 'communication', label: 'Communication & Transparency', keywords: ['explain', 'clear', 'communication', 'listen', 'transparent', 'guide'] },
    ];

    const results: Array<{ theme: string; pos: number; neg: number; mentions: number }> = [];

    for (const topic of TOPIC_PATTERNS) {
      let mentions = 0;
      let posCount = 0;
      let negCount = 0;

      for (const rev of reviews) {
        const text = (rev.text || '').toLowerCase();
        const matches = topic.keywords.some((kw) => text.includes(kw));
        if (matches) {
          mentions += 1;
          if ((rev.rating || 0) >= 4) {
            posCount += 1;
          } else if ((rev.rating || 0) <= 2) {
            negCount += 1;
          }
        }
      }

      if (mentions > 0) {
        const decidedTotal = Math.max(1, posCount + negCount);
        const pos = Math.round((posCount / decidedTotal) * 100);
        const neg = 100 - pos;
        results.push({
          theme: topic.label,
          pos,
          neg,
          mentions,
        });
      }
    }

    results.sort((a, b) => b.mentions - a.mentions);
    return results;
  }, [details?.reviews]);

  return (
    <div className="w-full bg-[#0f1011] rounded-2xl border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] overflow-hidden flex flex-col text-zinc-100">
      {/* 1. TOP COMPETITOR PROFILE HEADER */}
      <div className="p-6 border-b border-zinc-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        {/* Left: Competitor Avatar & Basic Details */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={competitor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xl font-bold text-zinc-500">
                {competitor.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                {competitor.name}
              </h2>
              <CheckCircle2 className="w-4 h-4 text-[#5e6ad2] fill-[#5e6ad2]/20" />
            </div>

            <p className="text-xs text-zinc-400 font-medium">
              {formatCategory(competitor.primary_type)}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400 pt-0.5">
              {distanceKm != null && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{distanceKm} km away</span>
                  {address && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="truncate max-w-[220px]">{address}</span>
                    </>
                  )}
                </div>
              )}

              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5e6ad2] hover:text-[#7c88eb] flex items-center gap-1 font-medium ml-1 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[180px]">{website.replace(/^https?:\/\//, '')}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Google Attribution if available */}
            {photoAttributions && photoAttributions.length > 0 && photoAttributions[0].displayName && (
              <div className="text-[10px] text-zinc-500 pt-0.5">
                Photo by {photoAttributions[0].displayName}
              </div>
            )}
          </div>
        </div>

        {/* Center: 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Rating */}
          <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-base font-bold text-zinc-100 font-mono">
                {rating != null ? rating.toFixed(1) : '–'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Rating</span>
              {compDelta != null ? (
                <span className={`font-semibold flex items-center font-mono ${compDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {compDelta >= 0 ? `+${compDelta.toFixed(1)}` : `${compDelta.toFixed(1)}`}
                </span>
              ) : (
                <span className="text-zinc-600 font-mono">–</span>
              )}
            </div>
          </div>

          {/* Card 2: Total Reviews */}
          <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-center">
            <div className="text-base font-bold text-zinc-100 font-mono mb-1">
              {reviewCount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Total Reviews</span>
              {compGrowth != null ? (
                <span className="text-emerald-400 font-semibold flex items-center font-mono">
                  +{compGrowth}%
                </span>
              ) : (
                <span className="text-zinc-600 font-mono">–</span>
              )}
            </div>
          </div>

          {/* Card 3: Positive Sentiment */}
          <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Smile className="w-4 h-4 text-emerald-400" />
              <span className="text-base font-bold text-zinc-100 font-mono">
                {compPositive != null ? `${compPositive}%` : '–'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Positive Sentiment</span>
              {compPositive != null && bizPositive != null ? (
                <span className={`font-semibold flex items-center font-mono ${compPositive >= bizPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {compPositive >= bizPositive ? `+${compPositive - bizPositive}%` : `${compPositive - bizPositive}%`}
                </span>
              ) : (
                <span className="text-zinc-600 font-mono">–</span>
              )}
            </div>
          </div>

          {/* Card 4: Negative Sentiment */}
          <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Frown className="w-4 h-4 text-rose-400" />
              <span className="text-base font-bold text-zinc-100 font-mono">
                {compNegative != null ? `${compNegative}%` : '–'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Negative Sentiment</span>
              {compNegative != null && bizNegative != null ? (
                <span className={`font-semibold flex items-center font-mono ${compNegative <= bizNegative ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {compNegative <= bizNegative ? `${compNegative - bizNegative}%` : `+${compNegative - bizNegative}%`}
                </span>
              ) : (
                <span className="text-zinc-600 font-mono">–</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Track Competitor + View on Google Maps) */}
        <div className="flex xl:flex-col items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={handleTrackClick}
              disabled={isTrackingAction}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                isTracked
                  ? 'bg-[#5e6ad2]/20 text-[#828cf0] border border-[#5e6ad2]/40 hover:bg-[#5e6ad2]/30'
                  : 'bg-[#5e6ad2] hover:bg-[#6875e5] text-white shadow-[#5e6ad2]/20'
              }`}
            >
              {isTrackingAction ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isTracked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#828cf0]" />
                  <span>Tracked</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Track Competitor</span>
                </>
              )}
            </button>

            {isTracked && (
              <button
                onClick={handleSyncClick}
                disabled={isSyncing}
                title="Sync with Google Place Details"
                className="p-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#5e6ad2]' : ''}`} />
              </button>
            )}
          </div>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>View on Google Maps</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </a>
          )}
        </div>
      </div>

      {/* 2. TABS BAR */}
      <div className="px-6 border-b border-zinc-800/80 flex items-center gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'reviews', label: 'Ratings & Reviews' },
          { id: 'sentiment', label: 'Sentiment' },
          { id: 'themes', label: 'Themes' },
          { id: 'comparison', label: 'Comparison' },
          { id: 'feedback', label: 'Customer Feedback' },
          { id: 'instagram', label: 'Instagram' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'border-[#5e6ad2] text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. TABS CONTENT */}
      <div className="p-6">
        {/* TAB 1: OVERVIEW (3 CARDS SIDE-BY-SIDE AS IN REFERENCE SCREENSHOT) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CARD 1: Key Metrics Comparison */}
            <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-4">
                  Key Metrics Comparison
                </h3>

                {isLoadingComparison ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Loader2 className="w-5 h-5 text-[#5e6ad2] animate-spin" />
                    <span className="text-xs text-zinc-500 font-mono">Loading metrics...</span>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs">
                    {/* Table Header */}
                    <div className="grid grid-cols-3 text-[11px] font-semibold pb-2 border-b border-zinc-800">
                      <span className="text-zinc-500">Metric</span>
                      <span className="text-[#828cf0] text-right flex items-center justify-end gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-[#5e6ad2] shrink-0"></span>
                        <span className="truncate">{businessName}</span>
                      </span>
                      <span className="text-rose-400 text-right flex items-center justify-end gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                        <span className="truncate">{competitor.name}</span>
                      </span>
                    </div>

                    {/* Row 1: Average Rating */}
                    <div className="grid grid-cols-3 items-center py-1">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        Average Rating
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {bizRating != null ? bizRating.toFixed(1) : '–'}
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {rating != null ? rating.toFixed(1) : '–'}
                      </span>
                    </div>

                    {/* Row 2: Total Reviews */}
                    <div className="grid grid-cols-3 items-center py-1">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                        Total Reviews
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {bizReviewCount.toLocaleString()}
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {reviewCount.toLocaleString()}
                      </span>
                    </div>

                    {/* Row 3: Positive Sentiment */}
                    <div className="grid grid-cols-3 items-center py-1">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-emerald-400" />
                        Positive Sentiment
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {bizPositive != null ? `${bizPositive}%` : '–'}
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {compPositive != null ? `${compPositive}%` : '–'}
                      </span>
                    </div>

                    {/* Row 4: Negative Sentiment */}
                    <div className="grid grid-cols-3 items-center py-1">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Frown className="w-3.5 h-3.5 text-rose-400" />
                        Negative Sentiment
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {bizNegative != null ? `${bizNegative}%` : '–'}
                      </span>
                      <span className="font-bold text-zinc-100 text-right font-mono">
                        {compNegative != null ? `${compNegative}%` : '–'}
                      </span>
                    </div>

                    {/* Row 5: Review Growth */}
                    <div className="grid grid-cols-3 items-center py-1">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Review Growth (3m)
                      </span>
                      <span className="font-bold text-emerald-400 text-right font-mono">
                        {bizGrowth != null ? `+${bizGrowth}%` : '–'}
                      </span>
                      <span className="font-bold text-emerald-400 text-right font-mono">
                        {compGrowth != null ? `+${compGrowth}%` : '–'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: Rating Trend Comparison (SVG Line Chart) */}
            <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-4">
                  Rating Trend Comparison
                </h3>

                {ratingTrendBiz.length === 0 && ratingTrendComp.length === 0 ? (
                  <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 space-y-1.5">
                    <TrendingUp className="w-5 h-5 text-zinc-600" />
                    <p className="text-xs text-zinc-400">Historical trend data pending</p>
                    <p className="text-[11px] text-zinc-600 font-mono">Syncing review history across periods...</p>
                  </div>
                ) : (
                  <div className="h-44 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 130">
                      {/* Horizontal Grid lines 5.0, 4.0, 3.0, 2.0, 1.0 */}
                      {[
                        { y: 15, label: '5.0' },
                        { y: 40, label: '4.0' },
                        { y: 65, label: '3.0' },
                        { y: 90, label: '2.0' },
                        { y: 115, label: '1.0' },
                      ].map((grid, i) => (
                        <g key={i}>
                          <text x="0" y={grid.y + 3} fill="#71717a" fontSize="9" textAnchor="start" fontFamily="monospace">
                            {grid.label}
                          </text>
                          <line x1="28" y1={grid.y} x2="295" y2={grid.y} stroke="#27272a" strokeWidth="1" strokeDasharray="2 2" />
                        </g>
                      ))}

                      {/* Month Labels along X axis */}
                      {ratingTrendBiz.concat(ratingTrendComp).length > 0 &&
                        ['Jul', 'Aug', 'Sep', 'Oct'].map((m, i) => (
                          <text
                            key={i}
                            x={65 + i * 70}
                            y="128"
                            fill="#a1a1aa"
                            fontSize="9.5"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {m}
                          </text>
                        ))}

                      {/* Blue/Indigo Line: Your Business */}
                      {ratingTrendBiz.length > 0 &&
                        (() => {
                          const points = ratingTrendBiz.map((pt, idx) => {
                            const x = 65 + idx * 70;
                            const y = 115 - ((pt.rating - 1.0) / 4.0) * 100;
                            return { x, y };
                          });
                          const d = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                          return (
                            <g>
                              <path d={d} fill="none" stroke="#5e6ad2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#5e6ad2" stroke="#0f1011" strokeWidth="2" />
                              ))}
                            </g>
                          );
                        })()}

                      {/* Rose Line: Competitor */}
                      {ratingTrendComp.length > 0 &&
                        (() => {
                          const points = ratingTrendComp.map((pt, idx) => {
                            const x = 65 + idx * 70;
                            const y = 115 - ((pt.rating - 1.0) / 4.0) * 100;
                            return { x, y };
                          });
                          const d = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                          return (
                            <g>
                              <path d={d} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#f43f5e" stroke="#0f1011" strokeWidth="2" />
                              ))}
                            </g>
                          );
                        })()}
                    </svg>
                  </div>
                )}
              </div>

              {/* Bottom Legend */}
              <div className="flex items-center justify-center gap-5 pt-3 border-t border-zinc-800 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5e6ad2]"></span>
                  <span>Your Business</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-zinc-300 truncate max-w-[150px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span className="truncate">{competitor.name}</span>
                </div>
              </div>
            </div>

            {/* CARD 3: Sentiment Comparison (Grouped Bar Chart) */}
            <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-4">
                  Sentiment Comparison
                </h3>

                {bizPositive == null && compPositive == null ? (
                  <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 space-y-1.5">
                    <Smile className="w-5 h-5 text-zinc-600" />
                    <p className="text-xs text-zinc-400">Sentiment comparison pending</p>
                    <p className="text-[11px] text-zinc-600 font-mono">Syncing competitor review analytics...</p>
                  </div>
                ) : (
                  /* Grouped Bars Area */
                  <div className="h-44 w-full flex items-end justify-around px-2 pt-2 border-b border-zinc-800 pb-2">
                    {/* Category 1: Positive */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-end gap-1.5 h-32">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{bizPositive ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-[#5e6ad2] transition-all duration-500 shadow-sm shadow-[#5e6ad2]/20"
                            style={{ height: `${((bizPositive ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{compPositive ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-rose-500 transition-all duration-500 shadow-sm shadow-rose-500/20"
                            style={{ height: `${((compPositive ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400">Positive</span>
                    </div>

                    {/* Category 2: Neutral */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-end gap-1.5 h-32">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{bizNeutral ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-[#5e6ad2]/70 transition-all duration-500"
                            style={{ height: `${((bizNeutral ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{compNeutral ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-rose-500/70 transition-all duration-500"
                            style={{ height: `${((compNeutral ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400">Neutral</span>
                    </div>

                    {/* Category 3: Negative */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-end gap-1.5 h-32">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{bizNegative ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-[#5e6ad2]/50 transition-all duration-500"
                            style={{ height: `${((bizNegative ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-300 font-mono mb-1">{compNegative ?? 0}%</span>
                          <div
                            className="w-6 rounded-t-md bg-rose-500/50 transition-all duration-500"
                            style={{ height: `${((compNegative ?? 0) / 100) * 110}px` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400">Negative</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Legend */}
              <div className="flex items-center justify-center gap-5 pt-3 border-t border-zinc-800 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5e6ad2]"></span>
                  <span>Your Business</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-zinc-300 truncate max-w-[150px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span className="truncate">{competitor.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RATINGS & REVIEWS (REAL GOOGLE REVIEWS FROM PLACE.FETCHFIELDS) */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <Loader2 className="w-5 h-5 text-[#5e6ad2] animate-spin" />
                <span className="text-xs text-zinc-400 font-mono">Fetching verified Google reviews...</span>
              </div>
            ) : details?.reviews && details.reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.reviews.map((rev, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {rev.authorAttribution?.photoURI ? (
                          <img
                            src={rev.authorAttribution.photoURI}
                            alt={rev.authorAttribution.displayName || 'Reviewer'}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">
                            {rev.authorAttribution?.displayName || 'Google Customer'}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {rev.relativePublishTimeDescription || 'Recent'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400 font-bold text-xs font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{rev.rating}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      "{rev.text}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                No Google customer reviews available for this place.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SENTIMENT */}
        {activeTab === 'sentiment' && (
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300">Sentiment Distribution Comparison</h3>
            {bizPositive != null || compPositive != null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-[#828cf0] block">{businessName}</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Positive</span>
                      <span className="font-bold text-emerald-400 font-mono">{bizPositive ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${bizPositive ?? 0}%` }}></div>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-zinc-400">Negative</span>
                      <span className="font-bold text-rose-400 font-mono">{bizNegative ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${bizNegative ?? 0}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-rose-400 block">{competitor.name}</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Positive</span>
                      <span className="font-bold text-emerald-400 font-mono">{compPositive ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${compPositive ?? 0}%` }}></div>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-zinc-400">Negative</span>
                      <span className="font-bold text-rose-400 font-mono">{compNegative ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${compNegative ?? 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                Sentiment distribution data is pending analysis for this competitor.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: THEMES */}
        {activeTab === 'themes' && (
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300">Key Themes & Topic Highlights</h3>
            {dynamicThemes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dynamicThemes.map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">{t.theme}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{t.mentions} {t.mentions === 1 ? 'mention' : 'mentions'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-emerald-400 font-semibold">{t.pos}% positive</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-rose-400 font-semibold">{t.neg}% negative</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                {isLoadingDetails ? 'Analyzing reviews for themes...' : 'No verified customer review theme mentions extracted yet for this place.'}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COMPARISON */}
        {activeTab === 'comparison' && (
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300">Comprehensive Benchmarking</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold">
                    <th className="py-2.5">Dimension</th>
                    <th className="py-2.5 text-[#828cf0]">{businessName}</th>
                    <th className="py-2.5 text-rose-400">{competitor.name}</th>
                    <th className="py-2.5 text-zinc-300">Net Differential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  <tr>
                    <td className="py-3 font-medium text-zinc-400">Customer Rating</td>
                    <td className="py-3 font-bold font-mono">{bizRating != null ? `${bizRating.toFixed(1)} ★` : '–'}</td>
                    <td className="py-3 font-bold font-mono">{rating != null ? `${rating.toFixed(1)} ★` : '–'}</td>
                    <td className="py-3 font-bold text-rose-400 font-mono">
                      {rating != null && bizRating != null
                        ? rating >= bizRating
                          ? `+${(rating - bizRating).toFixed(1)} ★`
                          : `-${(bizRating - rating).toFixed(1)} ★`
                        : '–'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-zinc-400">Review Volume</td>
                    <td className="py-3 font-mono">{bizReviewCount.toLocaleString()}</td>
                    <td className="py-3 font-mono">{reviewCount.toLocaleString()}</td>
                    <td className="py-3 font-mono text-emerald-400">
                      {reviewCount >= bizReviewCount
                        ? `+${(reviewCount - bizReviewCount).toLocaleString()}`
                        : `-${(bizReviewCount - reviewCount).toLocaleString()}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-zinc-400">Positive Ratio</td>
                    <td className="py-3 font-mono">{bizPositive != null ? `${bizPositive}%` : '–'}</td>
                    <td className="py-3 font-mono">{compPositive != null ? `${compPositive}%` : '–'}</td>
                    <td className="py-3 font-mono text-emerald-400">
                      {compPositive != null && bizPositive != null
                        ? `${compPositive >= bizPositive ? '+' : ''}${compPositive - bizPositive}%`
                        : '–'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-zinc-400">Negative Ratio</td>
                    <td className="py-3 font-mono">{bizNegative != null ? `${bizNegative}%` : '–'}</td>
                    <td className="py-3 font-mono">{compNegative != null ? `${compNegative}%` : '–'}</td>
                    <td className="py-3 font-mono text-rose-400">
                      {compNegative != null && bizNegative != null
                        ? `${compNegative <= bizNegative ? '' : '+'}${compNegative - bizNegative}%`
                        : '–'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMER FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="space-y-3">
            {details?.reviews && details.reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.reviews.map((rev, i) => (
                  <blockquote
                    key={i}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-300 italic space-y-2"
                  >
                    <p>"{rev.text}"</p>
                    <cite className="not-italic text-[11px] text-zinc-500 font-medium block">
                      — {rev.authorAttribution?.displayName || 'Verified Reviewer'} (★ {rev.rating})
                    </cite>
                  </blockquote>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                No customer feedback snippets available.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: INSTAGRAM TELEMETRY */}
        {activeTab === 'instagram' && (
          <div className="space-y-4">
            <InstagramIntegrationSection
              businessId={businessId}
              businessName={competitor.name}
              competitorId={trackedRecord?.id || null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
