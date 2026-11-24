import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { competitorApi, type CompetitorItem, type TrackedCompetitor } from '../api/competitorApi';
import { businessApi } from '../api/businessApi';
import { searchNearbyCompetitors, extractBusinessPlaceLocation } from '../services/googleMapsService';
import GoogleCompetitorMap from '../components/competitors/GoogleCompetitorMap';
import CompetitorCard from '../components/competitors/CompetitorCard';
import CompetitorDetailPanel from '../components/competitors/CompetitorDetailPanel';
import {
  Search,
  RefreshCw,
  Calendar,
  ChevronDown,
  Loader2,
  Building2,
  AlertCircle,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ArrowUpDown,
} from 'lucide-react';

const RADIUS_OPTIONS = [
  { value: '1000', label: '1km' },
  { value: '3000', label: '3km' },
  { value: '5000', label: '5km' },
  { value: '10000', label: '10km' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'skin_care_clinic', label: 'Skin Care Clinic' },
  { value: 'beauty_salon', label: 'Beauty Salon' },
  { value: 'spa', label: 'Day Spa' },
  { value: 'medical_spa', label: 'Medical Spa' },
  { value: 'dentist', label: 'Dental Clinic' },
  { value: 'doctor', label: 'Medical Clinic' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café & Bakery' },
  { value: 'gym', label: 'Fitness & Gym' },
  { value: 'store', label: 'Retail Store' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'reviews', label: 'Reviews' },
];

export default function CompetitorsView() {
  const { activeBusiness, businesses, setActiveBusiness } = useBusiness();

  // Filters State
  const [selectedRadius, setSelectedRadius] = useState<string>('5000');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('distance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('Last 3 months');

  // Layout View Mode (Split View vs Cinema Full Radar)
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);

  // Dropdown UI toggles
  const [isBizMenuOpen, setIsBizMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);

  // Data State
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [trackedCompetitors, setTrackedCompetitors] = useState<TrackedCompetitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorItem | null>(null);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic Real-time Location Resolution
  const [resolvedLocation, setResolvedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string | null;
    placeId?: string | null;
  } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState<boolean>(false);

  // Dynamically extract real coordinates and Place ID for the selected business using Google Places API
  useEffect(() => {
    if (!activeBusiness) {
      setResolvedLocation(null);
      return;
    }

    const currentBiz = activeBusiness;
    let isCancelled = false;

    async function resolveLocation() {
      if (currentBiz.latitude != null && currentBiz.longitude != null) {
        setResolvedLocation({
          lat: Number(currentBiz.latitude),
          lng: Number(currentBiz.longitude),
          address: currentBiz.location,
          placeId: currentBiz.google_place_id,
        });
        return;
      }

      setIsResolvingLocation(true);
      setErrorMsg(null);

      try {
        const extracted = await extractBusinessPlaceLocation(
          currentBiz.name,
          currentBiz.location,
          currentBiz.google_place_id
        );

        if (!isCancelled) {
          if (extracted) {
            setResolvedLocation({
              lat: extracted.lat,
              lng: extracted.lng,
              address: extracted.address,
              placeId: extracted.place_id,
            });

            if (currentBiz.id) {
              businessApi
                .updateBusiness(currentBiz.id, {
                  latitude: extracted.lat,
                  longitude: extracted.lng,
                  google_place_id: extracted.place_id,
                  location: extracted.address || currentBiz.location || undefined,
                })
                .catch((err) => console.warn('Background sync of extracted location to DB failed:', err));
            }
          } else {
            setErrorMsg(
              `Unable to locate "${currentBiz.name}" via Google Places. Please verify the business name or location.`
            );
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('Google Places dynamic location extraction error:', err);
          setErrorMsg(err?.message || 'Failed to resolve business location via Google Places API.');
        }
      } finally {
        if (!isCancelled) setIsResolvingLocation(false);
      }
    }

    resolveLocation();

    return () => {
      isCancelled = true;
    };
  }, [
    activeBusiness?.id,
    activeBusiness?.name,
    activeBusiness?.location,
    activeBusiness?.latitude,
    activeBusiness?.longitude,
    activeBusiness?.google_place_id,
  ]);

  const businessLocation = useMemo(() => {
    if (resolvedLocation) {
      return { lat: resolvedLocation.lat, lng: resolvedLocation.lng };
    }
    return null;
  }, [resolvedLocation]);

  // Auto-scroll selected competitor card into view inside the list
  useEffect(() => {
    if (selectedCompetitor?.place_id) {
      const el = document.getElementById(`competitor-card-${selectedCompetitor.place_id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedCompetitor?.place_id]);

  // 1. Fetch Tracked Competitors from PostgreSQL
  const fetchTrackedCompetitors = useCallback(async () => {
    if (!activeBusiness?.id) return;
    try {
      const data = await competitorApi.getTrackedCompetitors(activeBusiness.id);
      setTrackedCompetitors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch tracked competitors:', err);
    }
  }, [activeBusiness]);

  useEffect(() => {
    fetchTrackedCompetitors();
  }, [fetchTrackedCompetitors]);

  // 2. Discover Nearby Competitors using Google Places API
  const discoverCompetitors = useCallback(async () => {
    if (!activeBusiness || !businessLocation) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const radiusMeters = parseInt(selectedRadius, 10) || 5000;
      const rankPreference = selectedSort === 'distance' ? 'DISTANCE' : 'POPULARITY';

      const results = await searchNearbyCompetitors({
        businessLocation,
        radiusMeters,
        category: selectedCategory || undefined,
        rankPreference,
        ownPlaceId: activeBusiness.google_place_id || undefined,
        ownBusinessName: activeBusiness.name,
      });

      const trackedSet = new Set(
        trackedCompetitors.filter((t) => t.tracked).map((t) => t.google_place_id)
      );

      const merged = results.map((item) => ({
        ...item,
        tracked: trackedSet.has(item.place_id),
      }));

      setCompetitors(merged);

      // Preserve or set selected competitor
      setSelectedCompetitor((prev) => {
        if (!prev) return merged.length > 0 ? merged[0] : null;
        const exists = merged.find((c) => c.place_id === prev.place_id);
        return exists || (merged.length > 0 ? merged[0] : null);
      });
    } catch (err: any) {
      console.warn('Google Places JS search failed, falling back to backend discovery:', err);
      try {
        const fallback = await competitorApi.discoverNearbyBackend(activeBusiness.id, {
          radius: parseInt(selectedRadius, 10) || 5000,
          category: selectedCategory || undefined,
          rank: selectedSort === 'distance' ? 'distance' : 'popularity',
        });
        if (fallback?.competitors && fallback.competitors.length > 0) {
          setCompetitors(fallback.competitors);
          setSelectedCompetitor((prev) => prev || fallback.competitors[0]);
          return;
        }
      } catch (fallbackErr) {
        console.error('Backend fallback also failed:', fallbackErr);
      }
      setErrorMsg(err?.message || 'Failed to retrieve nearby competitors from Google Places API.');
    } finally {
      setIsLoading(false);
    }
  }, [activeBusiness, businessLocation, selectedRadius, selectedCategory, selectedSort, trackedCompetitors]);

  useEffect(() => {
    discoverCompetitors();
  }, [discoverCompetitors]);

  // 3. Track / Untrack handler
  const handleTrackToggle = async (placeId: string, isCurrentlyTracked: boolean) => {
    if (!activeBusiness?.id) return;
    try {
      if (isCurrentlyTracked) {
        const match = trackedCompetitors.find((t) => t.google_place_id === placeId);
        if (match) {
          await competitorApi.untrackCompetitor(activeBusiness.id, match.id);
        }
      } else {
        await competitorApi.trackCompetitor(activeBusiness.id, placeId);
      }

      await fetchTrackedCompetitors();

      setCompetitors((prev) =>
        prev.map((c) => (c.place_id === placeId ? { ...c, tracked: !isCurrentlyTracked } : c))
      );
      if (selectedCompetitor?.place_id === placeId) {
        setSelectedCompetitor((prev) => (prev ? { ...prev, tracked: !isCurrentlyTracked } : null));
      }
    } catch (err: any) {
      console.error('Failed to toggle tracking for competitor:', err);
      alert(err?.message || 'Failed to update competitor tracking status.');
    }
  };

  // 4. Client-side Search & Sort
  const filteredAndSortedCompetitors = useMemo(() => {
    let list = [...competitors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.primary_type && c.primary_type.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (selectedSort === 'distance') {
        const da = a.distance_km ?? 9999;
        const db = b.distance_km ?? 9999;
        return da - db;
      }
      if (selectedSort === 'rating') {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (selectedSort === 'reviews') {
        return (b.review_count || 0) - (a.review_count || 0);
      }
      const scoreA = (a.rating || 0) * Math.log10(Math.max(1, a.review_count || 1));
      const scoreB = (b.rating || 0) * Math.log10(Math.max(1, b.review_count || 1));
      return scoreB - scoreA;
    });

    return list;
  }, [competitors, searchQuery, selectedSort]);

  const selectedCategoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label || 'All Categories';
  const selectedSortLabel =
    SORT_OPTIONS.find((s) => s.value === selectedSort)?.label || 'Distance';

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-zinc-100 pb-16">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626]">
        <div>
          <h1 className="font-serif font-light text-2xl sm:text-3xl text-white tracking-[-0.02em]">Competitor Radar</h1>
          <p className="text-xs text-[#a3a3a3] mt-1 max-w-[65ch]">
            Real-time geospatial intelligence and market positioning powered by Google Places.
          </p>
        </div>

        {/* Right Corner: Business Selector & Timeframe Filter */}
        <div className="flex items-center gap-2.5">
          {/* Business Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsBizMenuOpen(!isBizMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-[#262626] text-xs font-semibold text-white hover:bg-[#1f1f1f] hover:border-[#404040] transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-[#4ade80]/20 text-[#4ade80] flex items-center justify-center text-[10px] font-bold">
                {activeBusiness?.name?.charAt(0) || 'B'}
              </div>
              <span className="truncate max-w-[160px]">{activeBusiness?.name || 'Select Business'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#737373]" />
            </button>

            {isBizMenuOpen && businesses.length > 0 && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl py-1 z-50 text-xs">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBusiness(b);
                      setIsBizMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-[#1f1f1f] transition-colors cursor-pointer ${activeBusiness?.id === b.id ? 'bg-[#4ade80]/15 text-[#4ade80] font-semibold' : 'text-zinc-300'
                      }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#737373]" />
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-[#262626] text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f] hover:border-[#404040] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#737373]" />
              <span>{timeframe}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#737373]" />
            </button>

            {isTimeframeOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl py-1 z-50 text-xs">
                {['Last 30 days', 'Last 3 months', 'Last 6 months', 'Last 1 year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setIsTimeframeOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#1f1f1f] transition-colors cursor-pointer ${timeframe === tf ? 'text-[#4ade80] font-semibold bg-[#4ade80]/15' : 'text-zinc-300'
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* 2. MINIMAL COMMAND HUD DECK */}
        <div className="p-2.5 bg-[#171717] rounded-2xl border border-[#262626] shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Business GPS Location Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1f1f1f] border border-[#262626] text-xs font-medium text-white shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]"></span>
              </span>
              <span className="truncate max-w-[180px]" title={resolvedLocation?.address || activeBusiness?.location || activeBusiness?.name || 'Locating...'}>
                {isResolvingLocation ? (
                  <span className="flex items-center gap-1.5 text-[#a3a3a3] font-mono text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin text-[#4ade80]" />
                    Locating GPS...
                  </span>
                ) : (
                  resolvedLocation?.address
                    ? resolvedLocation.address.split(',')[0]
                    : activeBusiness?.location || activeBusiness?.name || 'Location pending'
                )}
              </span>
            </div>

            {/* Segmented Radius Selector Pills */}
            <div className="flex items-center p-0.5 bg-[#141414] rounded-full border border-[#262626]">
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = selectedRadius === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRadius(opt.value)}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded-full transition-all duration-150 cursor-pointer ${isSelected
                      ? 'bg-white text-[#0a0a0a] font-semibold shadow-sm'
                      : 'text-[#a3a3a3] hover:text-white'
                      }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pill */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-medium text-zinc-300 transition-all shadow-sm cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>{selectedCategoryLabel}</span>
                <ChevronDown className="w-3 h-3 text-[#737373]" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 mt-1.5 w-52 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl py-1 z-50 text-xs">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedCategory(opt.value);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-[#1f1f1f] transition-colors cursor-pointer ${selectedCategory === opt.value ? 'text-[#4ade80] font-semibold bg-[#4ade80]/15' : 'text-zinc-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Filter Input, Refresh & Cinema Mode Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Minimal Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
              <input
                type="text"
                placeholder="Filter rivals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-6 py-1.5 rounded-full bg-[#1f1f1f] border border-[#262626] text-xs text-white placeholder-[#737373] focus:outline-none focus:border-[#4ade80] transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Refresh Action Button */}
            <button
              onClick={() => discoverCompetitors()}
              disabled={isLoading || isResolvingLocation}
              title="Rescan Area"
              className="p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/25 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isResolvingLocation ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Rescan</span>
            </button>

            {/* Layout Toggle (Cinema Radar vs Split View) */}
            <button
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              title={isCinemaMode ? 'Switch to Split View' : 'Switch to Cinema Radar'}
              className="hidden lg:flex p-2 rounded-full bg-[#1f1f1f] border border-[#262626] text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-all cursor-pointer"
            >
              {isCinemaMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Error Notification if any */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-[#737373] hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* 3. MIDDLE SECTION: GOOGLE MAP + NEARBY RIVALS (CINEMA or SPLIT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Google Map Canvas */}
          <div
            className={`transition-all duration-300 ${isCinemaMode
              ? 'lg:col-span-12 h-[580px]'
              : 'lg:col-span-7 xl:col-span-8 h-[520px] lg:h-[560px]'
              }`}
          >
            {businessLocation ? (
              <GoogleCompetitorMap
                businessLocation={businessLocation}
                businessName={activeBusiness?.name || "Business"}
                competitors={filteredAndSortedCompetitors}
                selectedCompetitor={selectedCompetitor}
                onSelectCompetitor={(comp) => setSelectedCompetitor(comp)}
                radiusMeters={parseInt(selectedRadius, 10) || 5000}
                isCinemaMode={isCinemaMode}
                onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
              />
            ) : (
              <div className="h-full bg-[#171717] rounded-2xl border border-[#262626] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#4ade80] animate-spin" />
                <div className="space-y-1">
                  <h4 className="font-serif font-light text-base text-white">Resolving Radar Coordinates</h4>
                  <p className="text-xs text-[#a3a3a3] font-mono">
                    Querying Google Places API for "{activeBusiness?.name}"...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right / Underneath: Nearby Competitors List Card */}
          <div
            className={`bg-[#171717] rounded-2xl border border-[#262626] shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${isCinemaMode
              ? 'lg:col-span-12 h-[340px]'
              : 'lg:col-span-5 xl:col-span-4 h-[520px] lg:h-[560px]'
              }`}
          >
            {/* Header: Nearby Rivals Counter & Sort Dropdown */}
            <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#141414]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-medium">
                  Nearby Rivals
                </span>
                <span className="text-xs text-[#a3a3a3] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-[#1f1f1f] border border-[#262626]">
                  {filteredAndSortedCompetitors.length}
                </span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-1.5 text-xs text-[#a3a3a3] hover:text-white font-mono transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-[#737373]" />
                  <span>{selectedSortLabel}</span>
                  <ChevronDown className="w-3 h-3 text-[#737373]" />
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl py-1 z-50 text-xs">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSelectedSort(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 font-mono hover:bg-[#1f1f1f] transition-colors cursor-pointer ${selectedSort === opt.value ? 'text-[#4ade80] font-semibold bg-[#4ade80]/15' : 'text-zinc-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Competitor Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isResolvingLocation && filteredAndSortedCompetitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-7 h-7 text-[#4ade80] animate-spin" />
                  <span className="text-xs text-[#a3a3a3] font-mono">Resolving business location via Google Places...</span>
                </div>
              ) : isLoading && filteredAndSortedCompetitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-7 h-7 text-[#4ade80] animate-spin" />
                  <span className="text-xs text-[#a3a3a3] font-mono">Discovering nearby competitors...</span>
                </div>
              ) : filteredAndSortedCompetitors.length > 0 ? (
                filteredAndSortedCompetitors.map((comp) => (
                  <CompetitorCard
                    key={comp.place_id}
                    competitor={comp}
                    isSelected={selectedCompetitor?.place_id === comp.place_id}
                    onSelect={(c) => setSelectedCompetitor(c)}
                  />
                ))
              ) : (
                <div className="py-20 text-center space-y-2">
                  <Building2 className="w-8 h-8 text-[#737373] mx-auto" />
                  <h4 className="text-xs font-semibold text-zinc-300">No competitors found</h4>
                  <p className="text-[11px] text-[#737373] max-w-xs mx-auto">
                    Try expanding the search radius or selecting a different category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. BOTTOM SECTION: SELECTED COMPETITOR DETAIL & COMPARISON BENCHMARK */}
        {selectedCompetitor && (
          <div className="w-full pt-2">
            <CompetitorDetailPanel
              businessId={activeBusiness!.id}
              businessName={activeBusiness?.name || "Business"}
              businessLocation={businessLocation}
              competitor={selectedCompetitor}
              trackedCompetitors={trackedCompetitors}
              onTrackToggle={handleTrackToggle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
