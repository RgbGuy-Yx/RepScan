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
  { value: 'skin_care_clinic', label: 'Skin Care Clinic' },
  { value: 'beauty_salon', label: 'Beauty Salon' },
  { value: 'spa', label: 'Day Spa' },
  { value: 'medical_spa', label: 'Medical Spa' },
  { value: 'dentist', label: 'Dental Clinic' },
  { value: 'doctor', label: 'Medical Clinic' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café & Bakery' },
  { value: 'gym', label: 'Fitness & Gym' },
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
  const [selectedCategory, setSelectedCategory] = useState<string>('skin_care_clinic');
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

  // Dynamic Real-time Location Resolution (Zero Hardcoded Coordinates)
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
      // 1. If activeBusiness already has coordinates, use them immediately
      if (currentBiz.latitude != null && currentBiz.longitude != null) {
        setResolvedLocation({
          lat: Number(currentBiz.latitude),
          lng: Number(currentBiz.longitude),
          address: currentBiz.location,
          placeId: currentBiz.google_place_id,
        });
        return;
      }

      // 2. Otherwise extract in real time from Google Places API
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

            // Asynchronously sync the dynamically extracted location & Place ID back to PostgreSQL
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

  // 2. Discover Nearby Competitors using Google Places API (New)
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
    CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label || 'Skin Care Clinic';
  const selectedSortLabel =
    SORT_OPTIONS.find((s) => s.value === selectedSort)?.label || 'Distance';

  return (
    <div className="min-h-[100dvh] bg-[#010102] text-zinc-100 pb-16">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">Competitor Radar</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-[65ch]">
            Real-time geospatial intelligence and market positioning powered by Google Places.
          </p>
        </div>

        {/* Right Corner: Business Selector & Timeframe Filter */}
        <div className="flex items-center gap-2.5">
          {/* Business Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsBizMenuOpen(!isBizMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700 transition-all active:scale-[0.98]"
            >
              <div className="w-5 h-5 rounded-md bg-[#5e6ad2]/20 text-[#828cf0] flex items-center justify-center text-[10px] font-bold">
                {activeBusiness?.name?.charAt(0) || 'B'}
              </div>
              <span className="truncate max-w-[160px]">{activeBusiness?.name || "Sowmya's Skin Laser Clinic"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {isBizMenuOpen && businesses.length > 0 && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#0f1011] border border-zinc-800 shadow-2xl py-1 z-50 text-xs">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBusiness(b);
                      setIsBizMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-800/60 transition-colors ${
                      activeBusiness?.id === b.id ? 'bg-[#5e6ad2]/20 text-[#828cf0] font-semibold' : 'text-zinc-300'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 transition-all active:scale-[0.98]"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{timeframe}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {isTimeframeOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#0f1011] border border-zinc-800 shadow-2xl py-1 z-50 text-xs">
                {['Last 30 days', 'Last 3 months', 'Last 6 months', 'Last 1 year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setIsTimeframeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-zinc-800/60 transition-colors ${
                      timeframe === tf ? 'text-[#828cf0] font-semibold bg-[#5e6ad2]/20' : 'text-zinc-300'
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
        <div className="p-2 sm:p-2.5 bg-[#0b0c10] rounded-2xl border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Business GPS Location Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-medium text-zinc-200 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5e6ad2] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5e6ad2]"></span>
              </span>
              <span className="truncate max-w-[180px]" title={resolvedLocation?.address || activeBusiness?.location || activeBusiness?.name || 'Locating...'}>
                {isResolvingLocation ? (
                  <span className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin text-[#5e6ad2]" />
                    Locating GPS...
                  </span>
                ) : (
                  resolvedLocation?.address
                    ? resolvedLocation.address.split(',')[0]
                    : activeBusiness?.location || activeBusiness?.name || "Sowmya's Skin Laser Clinic"
                )}
              </span>
            </div>

            {/* Segmented Radius Selector Pills (Instant 1-Click) */}
            <div className="flex items-center p-0.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = selectedRadius === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRadius(opt.value)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-white/10'
                        : 'text-zinc-400 hover:text-zinc-200'
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 text-xs font-medium text-zinc-300 transition-all shadow-sm active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>{selectedCategoryLabel}</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 mt-1.5 w-52 rounded-xl bg-[#0f1011] border border-zinc-800 shadow-2xl py-1 z-50 text-xs">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedCategory(opt.value);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-zinc-800/60 transition-colors ${
                        selectedCategory === opt.value ? 'text-[#828cf0] font-semibold bg-[#5e6ad2]/20' : 'text-zinc-300'
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter rivals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#5e6ad2] transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
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
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#5e6ad2]/15 border border-[#5e6ad2]/35 text-[#828cf0] hover:bg-[#5e6ad2]/25 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isResolvingLocation ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Rescan</span>
            </button>

            {/* Layout Toggle (Cinema Radar vs Split View) */}
            <button
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              title={isCinemaMode ? 'Switch to Split View' : 'Switch to Cinema Radar'}
              className="hidden lg:flex p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
            >
              {isCinemaMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Error Notification if any */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-zinc-500 hover:text-zinc-300">
              ✕
            </button>
          </div>
        )}

        {/* 3. MIDDLE SECTION: GOOGLE MAP + NEARBY RIVALS (CINEMA or SPLIT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Google Map Canvas (Takes 12 columns in cinema mode, or 7/8 in split mode) */}
          <div
            className={`transition-all duration-300 ${
              isCinemaMode
                ? 'lg:col-span-12 h-[580px]'
                : 'lg:col-span-7 xl:col-span-8 h-[520px] lg:h-[560px]'
            }`}
          >
            {businessLocation ? (
              <GoogleCompetitorMap
                businessLocation={businessLocation}
                businessName={activeBusiness?.name || "Sowmya's Skin Laser Clinic"}
                competitors={filteredAndSortedCompetitors}
                selectedCompetitor={selectedCompetitor}
                onSelectCompetitor={(comp) => setSelectedCompetitor(comp)}
                radiusMeters={parseInt(selectedRadius, 10) || 5000}
                isCinemaMode={isCinemaMode}
                onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
              />
            ) : (
              <div className="h-full bg-[#0b0c10] rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#5e6ad2] animate-spin" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-200">Resolving Radar Coordinates</h4>
                  <p className="text-xs text-zinc-500 font-mono">
                    Querying Google Places API for "{activeBusiness?.name}"...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right / Underneath: Nearby Competitors List Card */}
          <div
            className={`bg-[#0b0c10] rounded-2xl border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex flex-col overflow-hidden transition-all duration-300 ${
              isCinemaMode
                ? 'lg:col-span-12 h-[340px]'
                : 'lg:col-span-5 xl:col-span-4 h-[520px] lg:h-[560px]'
            }`}
          >
            {/* Header: Nearby Rivals Counter & Sort Dropdown */}
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-[#090a0d]/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-medium">
                  Nearby Rivals
                </span>
                <span className="text-xs text-zinc-400 font-mono tabular-nums px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                  {filteredAndSortedCompetitors.length}
                </span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono transition-colors active:scale-95"
                >
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  <span>{selectedSortLabel}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-[#0f1011] border border-zinc-800 shadow-2xl py-1 z-50 text-xs">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSelectedSort(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 font-mono hover:bg-zinc-800/60 transition-colors ${
                          selectedSort === opt.value ? 'text-[#828cf0] font-semibold bg-[#5e6ad2]/20' : 'text-zinc-300'
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
                  <Loader2 className="w-7 h-7 text-[#5e6ad2] animate-spin" />
                  <span className="text-xs text-zinc-500 font-mono">Resolving business location via Google Places...</span>
                </div>
              ) : isLoading && filteredAndSortedCompetitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-7 h-7 text-[#5e6ad2] animate-spin" />
                  <span className="text-xs text-zinc-500 font-mono">Discovering nearby competitors...</span>
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
                  <Building2 className="w-8 h-8 text-zinc-700 mx-auto" />
                  <h4 className="text-xs font-semibold text-zinc-300">No competitors found</h4>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
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
              businessName={activeBusiness?.name || "Sowmya's Skin Laser Clinic"}
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
