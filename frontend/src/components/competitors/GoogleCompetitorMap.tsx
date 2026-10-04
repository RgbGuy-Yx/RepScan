/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';
import { getGoogleMapsLibraries } from '../../services/googleMapsService';
import type { CompetitorItem } from '../../api/competitorApi';
import { Loader2, MapPin, Plus, Minus, Navigation, Maximize2, Minimize2 } from 'lucide-react';

interface GoogleCompetitorMapProps {
  businessLocation: { lat: number; lng: number };
  businessName?: string;
  competitors: CompetitorItem[];
  selectedCompetitor: CompetitorItem | null;
  onSelectCompetitor: (competitor: CompetitorItem) => void;
  radiusMeters?: number;
  className?: string;
  isCinemaMode?: boolean;
  onToggleCinemaMode?: () => void;
}

export default function GoogleCompetitorMap({
  businessLocation,
  businessName = 'Your Business',
  competitors,
  selectedCompetitor,
  onSelectCompetitor,
  radiusMeters = 5000,
  className = '',
  isCinemaMode = false,
  onToggleCinemaMode,
}: GoogleCompetitorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const businessMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const competitorMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // 1. Initialize Google Map instance once
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(businessLocation);
        return;
      }
      try {
        setIsLoadingMap(true);
        setMapError(null);

        const { maps } = await getGoogleMapsLibraries();
        if (isCancelled) return;

        // Minimalist high-end dark cartography with suppressed POI noise
        const darkStyles: google.maps.MapTypeStyle[] = [
          { elementType: 'geometry', stylers: [{ color: '#08090d' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#08090d' }, { weight: 3 }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#555b6a' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#14161f' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#888f9e' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] }, // Suppress commercial clutter so competitor pins stand out
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#11131a' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#181b24' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1c1f2b' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#14161f' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040507' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#383e4d' }] },
        ];

        const map = new maps.Map(mapContainerRef.current, {
          center: businessLocation,
          zoom: 13,
          mapId: 'REPSCAN_DARK_COMPETITORS_MAP',
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          styles: darkStyles,
        });

        mapInstanceRef.current = map;
        setIsLoadingMap(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to initialize Google Maps:', err);
          setMapError(err?.message || 'Failed to load Google Map.');
          setIsLoadingMap(false);
        }
      }
    }

    initMap();

    return () => {
      isCancelled = true;
    };
  }, [businessLocation]);

  // 2. Render / Update Search Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isCancelled = false;

    async function updateRadiusCircle() {
      try {
        const { maps } = await getGoogleMapsLibraries();
        if (isCancelled || !map) return;

        if (radiusCircleRef.current) {
          radiusCircleRef.current.setMap(null);
          radiusCircleRef.current = null;
        }

        const circle = new maps.Circle({
          map,
          center: businessLocation,
          radius: radiusMeters,
          fillColor: '#5e6ad2',
          fillOpacity: 0.05,
          strokeColor: '#5e6ad2',
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
          clickable: false,
        });

        radiusCircleRef.current = circle;
      } catch (err) {
        console.warn('Failed to update radius circle:', err);
      }
    }

    updateRadiusCircle();

    return () => {
      isCancelled = true;
    };
  }, [businessLocation, radiusMeters]);

  // 3. Render / Update User's Business Marker (Pulsing Radar Beacon)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isCancelled = false;

    async function updateBusinessMarker() {
      try {
        const { marker } = await getGoogleMapsLibraries();
        if (isCancelled || !map) return;

        if (businessMarkerRef.current) {
          businessMarkerRef.current.map = null;
          businessMarkerRef.current = null;
        }

        const container = document.createElement('div');
        container.className = 'relative flex flex-col items-center cursor-pointer select-none group';
        container.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 rounded-full bg-[#1a73e8] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
          <div class="mt-1 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700/80 text-[10px] font-medium text-zinc-200 whitespace-nowrap shadow-md">
            ${escapeHtml(businessName)}
          </div>
        `;

        const bMarker = new marker.AdvancedMarkerElement({
          map,
          position: businessLocation,
          title: `${businessName} (Your Business)`,
          content: container,
          zIndex: 999,
        });

        businessMarkerRef.current = bMarker;
      } catch (err) {
        console.warn('Failed to create business marker:', err);
      }
    }

    updateBusinessMarker();

    return () => {
      isCancelled = true;
    };
  }, [businessLocation, businessName]);

  // 4. Render / Update Competitor Markers (Authentic Google Maps PinElement)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isCancelled = false;

    async function updateCompetitorMarkers() {
      try {
        const { marker, core } = await getGoogleMapsLibraries();
        if (isCancelled || !map) return;

        competitorMarkersRef.current.forEach((m) => {
          m.map = null;
        });
        competitorMarkersRef.current.clear();

        const bounds = new core.LatLngBounds();
        bounds.extend(businessLocation);

        competitors.forEach((comp) => {
          if (comp.latitude == null || comp.longitude == null) return;

          const position = { lat: comp.latitude, lng: comp.longitude };
          bounds.extend(position);

          const isSelected = selectedCompetitor?.place_id === comp.place_id;
          const distStr = comp.distance_km != null ? `${comp.distance_km}km` : '';

          // Authentic Google Maps PinElement
          const pin = new marker.PinElement({
            background: comp.tracked ? '#10b981' : '#ea4335',
            borderColor: comp.tracked ? '#047857' : '#c5221f',
            glyphColor: '#ffffff',
            scale: isSelected ? 1.05 : 0.82,
          });

          let markerContent: HTMLElement;

          if (isSelected) {
            // When clicked/selected: Show clean Google Maps style info bubble above the pin
            const container = document.createElement('div');
            container.className = 'relative flex flex-col items-center cursor-pointer select-none';
            container.innerHTML = `
              <div class="mb-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/90 shadow-2xl min-w-[190px] max-w-[240px] text-left">
                <div class="flex items-start justify-between gap-1.5">
                  <div class="text-xs font-semibold text-white leading-tight">${escapeHtml(comp.name)}</div>
                  <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    comp.tracked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                  }">
                    ${comp.tracked ? 'Tracked' : 'Rival'}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span class="truncate capitalize">${escapeHtml(formatCategory(comp.primary_type))}</span>
                  ${distStr ? `<span class="font-mono text-zinc-300 text-[10px] ml-2 shrink-0">${distStr}</span>` : ''}
                </div>
                <div class="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-zinc-800 text-xs">
                  <span class="text-amber-400 font-mono font-semibold text-xs">★ ${comp.rating ? comp.rating.toFixed(1) : '–'}</span>
                  <span class="text-[10.5px] font-mono text-zinc-500">(${comp.review_count.toLocaleString()} reviews)</span>
                </div>
              </div>
              <div class="w-2 h-2 rotate-45 -mt-2 mb-0.5 bg-zinc-900 border-r border-b border-zinc-700/90"></div>
            `;
            container.appendChild(pin.element);
            markerContent = container;
          } else {
            // Unselected: Pure, clean, authentic Google Maps Pin with zero text clutter!
            markerContent = pin.element;
          }

          const compMarker = new marker.AdvancedMarkerElement({
            map,
            position,
            title: comp.name,
            content: markerContent,
            zIndex: isSelected ? 900 : 500,
          });

          compMarker.addListener('click', () => {
            onSelectCompetitor(comp);
          });

          competitorMarkersRef.current.set(comp.place_id, compMarker);
        });

        if (competitors.length > 0) {
          map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
        }
      } catch (err) {
        console.warn('Failed to update competitor markers:', err);
      }
    }

    updateCompetitorMarkers();

    return () => {
      isCancelled = true;
    };
  }, [competitors, selectedCompetitor?.place_id, businessLocation, onSelectCompetitor]);

  // 5. Pan to selected competitor when changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCompetitor) return;

    if (selectedCompetitor.latitude != null && selectedCompetitor.longitude != null) {
      map.panTo({
        lat: selectedCompetitor.latitude,
        lng: selectedCompetitor.longitude,
      });
    }
  }, [selectedCompetitor]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 13;
      mapInstanceRef.current.setZoom(current + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 13;
      mapInstanceRef.current.setZoom(current - 1);
    }
  };

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(businessLocation);
      mapInstanceRef.current.setZoom(13);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-[#08090d] shadow-sm transition-all duration-300 ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Cinematic Vignette Shadow Overlay (Depth & Non-iframe feel) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_80px_rgba(1,1,2,0.65)] ring-1 ring-white/10" />

      {/* Floating HUD: Top Left Active Beacon Hub */}
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center gap-2 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8] border border-white/60 shrink-0"></span>
          <span className="text-xs font-semibold text-zinc-100 max-w-[150px] truncate">{businessName}</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">HQ</span>
        </div>
      </div>

      {/* Floating HUD: Top Right Telemetry Badge */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center gap-2 text-xs font-mono tabular-nums text-zinc-300 pointer-events-auto">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Radius</span>
          <span className="font-bold text-zinc-200">{(radiusMeters / 1000).toFixed(0)}km</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-400 font-medium">{competitors.length} Places</span>
        </div>
      </div>

      {/* Floating HUD: Bottom Left Clean Legend */}
      <div className="absolute bottom-3.5 left-3.5 z-20 hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-[10.5px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8] border border-white/40"></span>
          <span className="text-zinc-400 font-medium">Your Business</span>
        </div>
        <span className="text-zinc-700">•</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]"></span>
          <span className="text-zinc-400 font-medium">Rivals</span>
        </div>
        <span className="text-zinc-700">•</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
          <span className="text-zinc-400 font-medium">Tracked</span>
        </div>
      </div>

      {/* Floating HUD: Bottom Right Tactile Navigation Dock */}
      <div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col items-center gap-1 p-1 rounded-2xl bg-zinc-950/85 backdrop-blur-md border border-white/10 shadow-2xl">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-[0.90] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-[0.90] transition-all"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-4 h-px bg-zinc-800/80 my-0.5"></div>
        <button
          onClick={handleResetCenter}
          title="Recenter on HQ"
          className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-400 hover:text-[#5e6ad2] hover:bg-zinc-800/80 active:scale-[0.90] transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
        {onToggleCinemaMode && (
          <>
            <div className="w-4 h-px bg-zinc-800/80 my-0.5"></div>
            <button
              onClick={onToggleCinemaMode}
              title={isCinemaMode ? 'Standard Layout' : 'Expand Radar View'}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-[0.90] transition-all"
            >
              {isCinemaMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoadingMap && (
        <div className="absolute inset-0 bg-[#08090d]/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
          <span className="text-xs text-zinc-400 font-mono">Initializing Radar Map...</span>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && !isLoadingMap && (
        <div className="absolute inset-0 bg-[#08090d]/95 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 mb-3">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Map Loading Failed</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">{mapError}</p>
        </div>
      )}
    </div>
  );
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatCategory(type?: string | null): string {
  if (!type) return 'Competitor';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

