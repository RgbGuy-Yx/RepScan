/// <reference types="@types/google.maps" />
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { CompetitorItem } from '../api/competitorApi';

export interface GooglePlaceReview {
  rating: number;
  text: string;
  publishTime?: string | null;
  relativePublishTimeDescription?: string | null;
  authorAttribution?: {
    displayName?: string | null;
    photoURI?: string | null;
    uri?: string | null;
  } | null;
  originalText?: string | null;
  language?: string | null;
}

export interface DetailedCompetitorData extends CompetitorItem {
  website?: string | null;
  photos?: Array<{
    uri: string;
    attributions: Array<{ displayName?: string; uri?: string }>;
  }>;
  reviews?: GooglePlaceReview[];
}

export interface GoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  places: google.maps.PlacesLibrary;
  marker: google.maps.MarkerLibrary;
  geometry: google.maps.GeometryLibrary;
  core: google.maps.CoreLibrary;
}

// Singleton state
let isLoaderConfigured = false;
let librariesPromise: Promise<GoogleMapsLibraries> | null = null;

// In-memory cache for Place Details to optimize Google API usage
const placeDetailsCache = new Map<string, { data: DetailedCompetitorData; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in-memory cache

/**
 * Configure and load Google Maps JavaScript API libraries once.
 */
export async function getGoogleMapsLibraries(): Promise<GoogleMapsLibraries> {
  if (librariesPromise) {
    return librariesPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not defined in frontend environment');
  }

  if (!isLoaderConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    isLoaderConfigured = true;
  }

  librariesPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('places'),
    importLibrary('marker'),
    importLibrary('geometry'),
    importLibrary('core'),
  ]).then(([maps, places, marker, geometry, core]) => {
    return {
      maps: maps as google.maps.MapsLibrary,
      places: places as google.maps.PlacesLibrary,
      marker: marker as google.maps.MarkerLibrary,
      geometry: geometry as google.maps.GeometryLibrary,
      core: core as google.maps.CoreLibrary,
    };
  }).catch((err) => {
    librariesPromise = null; // Allow retry on failure
    throw err;
  });

  return librariesPromise;
}

export interface ExtractedPlaceLocation {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

/**
 * Dynamically extracts a business's real-time geographic location (lat, lng, place_id, address)
 * using the Google Maps Places API (New) without hardcoding coordinates.
 */
export async function extractBusinessPlaceLocation(
  businessName: string,
  locationHint?: string | null,
  knownPlaceId?: string | null
): Promise<ExtractedPlaceLocation | null> {
  const { places } = await getGoogleMapsLibraries();
  const { Place } = places;

  // 1. If a verified Google Place ID is already known, fetch its fields directly
  if (knownPlaceId) {
    try {
      const place = new Place({ id: knownPlaceId });
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        const lat = typeof place.location.lat === 'function' ? place.location.lat() : Number((place.location as any).lat);
        const lng = typeof place.location.lng === 'function' ? place.location.lng() : Number((place.location as any).lng);
        return {
          place_id: place.id,
          name: place.displayName || businessName,
          address: place.formattedAddress || null,
          lat,
          lng,
        };
      }
    } catch (err) {
      console.warn(`Direct fetch for placeId ${knownPlaceId} failed, falling back to searchByText:`, err);
    }
  }

  // 2. Otherwise dynamically search Google Places by business name + location hint
  const query = [businessName, locationHint].filter(Boolean).join(' ').trim();
  if (!query) return null;

  try {
    const response = await Place.searchByText({
      textQuery: query,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      maxResultCount: 1,
    });

    const rawPlaces = response.places || [];
    if (rawPlaces.length > 0) {
      const place = rawPlaces[0];
      if (place.location) {
        const lat = typeof place.location.lat === 'function' ? place.location.lat() : Number((place.location as any).lat);
        const lng = typeof place.location.lng === 'function' ? place.location.lng() : Number((place.location as any).lng);
        return {
          place_id: place.id,
          name: place.displayName || businessName,
          address: place.formattedAddress || null,
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    console.warn('Place.searchByText failed in frontend Google Maps service:', err);
  }

  return null;
}

export interface SearchNearbyParams {
  businessLocation: { lat: number; lng: number };
  radiusMeters: number;
  category?: string;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
  ownPlaceId?: string | null;
  ownBusinessName?: string | null;
}

/**
 * Perform nearby competitor search using modern Google Maps JS API Place.searchNearby()
 */
export async function searchNearbyCompetitors({
  businessLocation,
  radiusMeters,
  category,
  rankPreference = 'POPULARITY',
  ownPlaceId,
  ownBusinessName,
}: SearchNearbyParams): Promise<CompetitorItem[]> {
  const { places, geometry } = await getGoogleMapsLibraries();
  const { Place, SearchNearbyRankPreference } = places;

  // Validate radius (max 50,000 meters per Google API docs)
  const safeRadius = Math.max(100, Math.min(50000, radiusMeters));

  const centerLatLng = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);

  const request: google.maps.places.SearchNearbyRequest = {
    fields: [
      'displayName',
      'location',
      'formattedAddress',
      'googleMapsURI',
      'id',
      'primaryType',
      'rating',
      'userRatingCount',
    ],
    locationRestriction: {
      center: centerLatLng,
      radius: safeRadius,
    },
    maxResultCount: 20,
    rankPreference:
      rankPreference === 'DISTANCE'
        ? SearchNearbyRankPreference.DISTANCE
        : SearchNearbyRankPreference.POPULARITY,
  };

  if (category && category.trim()) {
    request.includedPrimaryTypes = [category.trim()];
  }

  const response = await Place.searchNearby(request);
  const rawPlaces = response.places || [];

  const normalizedBusinessName = ownBusinessName ? ownBusinessName.trim().toLowerCase() : '';
  const seenPlaceIds = new Set<string>();
  const results: CompetitorItem[] = [];

  for (const p of rawPlaces) {
    const placeId = p.id;
    if (!placeId || seenPlaceIds.has(placeId)) {
      continue;
    }
    seenPlaceIds.add(placeId);

    // Filter out user's own business by place_id
    if (ownPlaceId && placeId === ownPlaceId) {
      continue;
    }

    const placeLocation = p.location;
    let distanceKm: number | null = null;

    if (placeLocation) {
      const distanceMeters = geometry.spherical.computeDistanceBetween(centerLatLng, placeLocation);
      distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

      // Filter out user's own business by exact/close name within 50 meters
      const placeName = p.displayName || '';
      if (
        normalizedBusinessName &&
        placeName.trim().toLowerCase() === normalizedBusinessName &&
        distanceMeters < 50
      ) {
        continue;
      }
    }

    results.push({
      place_id: placeId,
      name: p.displayName || 'Unknown Competitor',
      address: p.formattedAddress || null,
      latitude: placeLocation ? placeLocation.lat() : null,
      longitude: placeLocation ? placeLocation.lng() : null,
      primary_type: p.primaryType || null,
      google_maps_url: p.googleMapsURI || null,
      rating: typeof p.rating === 'number' ? Math.round(p.rating * 10) / 10 : null,
      review_count: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
      distance_km: distanceKm,
    });
  }

  return results;
}

/**
 * Fetch detailed competitor info, photos, and reviews using Place.fetchFields()
 * Includes in-memory caching to avoid repeated Google API calls.
 */
export async function fetchCompetitorDetails(
  placeId: string,
  businessLocation?: { lat: number; lng: number } | null
): Promise<DetailedCompetitorData> {
  const cached = placeDetailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const { places, geometry } = await getGoogleMapsLibraries();
  const { Place } = places;

  const place = new Place({ id: placeId });

  await place.fetchFields({
    fields: [
      'displayName',
      'formattedAddress',
      'location',
      'rating',
      'userRatingCount',
      'websiteURI',
      'googleMapsURI',
      'primaryType',
      'photos',
      'reviews',
    ],
  });

  let distanceKm: number | null = null;
  if (businessLocation && place.location) {
    const centerLatLng = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);
    const distanceMeters = geometry.spherical.computeDistanceBetween(centerLatLng, place.location);
    distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
  }

  // Parse photos with author attributions
  const photos: Array<{
    uri: string;
    attributions: Array<{ displayName?: string; uri?: string }>;
  }> = [];

  if (place.photos && place.photos.length > 0) {
    for (const photo of place.photos.slice(0, 5)) {
      try {
        const uri = photo.getURI({ maxHeight: 400 });
        const attributions = (photo.authorAttributions || []).map((attr: any) => ({
          displayName: attr?.displayName,
          uri: attr?.uri,
        }));
        photos.push({ uri, attributions });
      } catch (err) {
        console.warn('Error fetching photo URI:', err);
      }
    }
  }

  // Parse Google reviews with author attributions
  const reviews: GooglePlaceReview[] = [];
  if (place.reviews && place.reviews.length > 0) {
    for (const rev of place.reviews) {
      reviews.push({
        rating: rev.rating || 5,
        text: rev.text || '',
        publishTime: rev.publishTime ? String(rev.publishTime) : undefined,
        relativePublishTimeDescription: rev.relativePublishTimeDescription,
        originalText: rev.originalText,
        language: rev.textLanguageCode,
        authorAttribution: rev.authorAttribution
          ? {
              displayName: rev.authorAttribution.displayName,
              photoURI: rev.authorAttribution.photoURI,
              uri: rev.authorAttribution.uri,
            }
          : undefined,
      });
    }
  }

  const detailData: DetailedCompetitorData = {
    place_id: placeId,
    name: place.displayName || 'Unknown Competitor',
    address: place.formattedAddress || null,
    latitude: place.location ? place.location.lat() : null,
    longitude: place.location ? place.location.lng() : null,
    primary_type: place.primaryType || null,
    website: place.websiteURI || null,
    google_maps_url: place.googleMapsURI || null,
    rating: typeof place.rating === 'number' ? Math.round(place.rating * 10) / 10 : null,
    review_count: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
    distance_km: distanceKm,
    photo_url: photos.length > 0 ? photos[0].uri : null,
    photo_attributions: photos.length > 0 ? photos[0].attributions : null,
    photos,
    reviews,
  };

  placeDetailsCache.set(placeId, { data: detailData, timestamp: Date.now() });
  return detailData;
}
