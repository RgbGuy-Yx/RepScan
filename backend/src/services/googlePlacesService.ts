import { config } from "../config";
import { logger } from "../config/logger";
import { AppError } from "../middleware/errorHandler";

export interface NormalizedGooglePlace {
  place_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number;
  primary_type: string | null;
  types: string[];
  website: string | null;
  google_maps_url: string | null;
}

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  category?: string;
  limit?: number;
  rankPreference?: "POPULARITY" | "DISTANCE";
  bypassCache?: boolean;
}

// ── Explicit Google Places API (New) Field Masks ────────────────────────────
// Wildcard "*" field masks are strictly forbidden in production.
const NEARBY_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
].join(",");

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "primaryType",
  "types",
  "googleMapsUri",
  "websiteUri",
  "rating",
  "userRatingCount",
].join(",");

// ── In-Memory Places Cache Layer (Separate from AI response cache) ────────────
interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

const nearbyCache = new Map<string, CacheItem<NormalizedGooglePlace[]>>();
const detailsCache = new Map<string, CacheItem<NormalizedGooglePlace>>();

const NEARBY_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const DETAILS_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function clearPlacesCache(): void {
  nearbyCache.clear();
  detailsCache.clear();
}

/**
 * Normalizes raw Google Places API (New) object into a standard RepScan place.
 */
export function normalizeGooglePlace(raw: any): NormalizedGooglePlace {
  let name = "";
  if (raw.displayName && typeof raw.displayName === "object") {
    name = raw.displayName.text || "";
  } else if (typeof raw.displayName === "string") {
    name = raw.displayName;
  } else if (typeof raw.name === "string" && !raw.name.startsWith("places/")) {
    name = raw.name;
  }

  const lat = raw.location?.latitude ?? null;
  const lng = raw.location?.longitude ?? null;
  const rating =
    raw.rating !== undefined && raw.rating !== null ? Number(raw.rating) : null;
  const reviewCount =
    raw.userRatingCount !== undefined && raw.userRatingCount !== null
      ? Number(raw.userRatingCount)
      : 0;

  // Extract clean place ID (Google Places API v1 may return "places/ChIJ...")
  let placeId = raw.id || "";
  if (!placeId && typeof raw.name === "string" && raw.name.startsWith("places/")) {
    placeId = raw.name.replace("places/", "");
  }

  return {
    place_id: placeId,
    name: name.trim() || "Unknown Business",
    address: raw.formattedAddress || null,
    latitude: lat !== null ? Number(lat) : null,
    longitude: lng !== null ? Number(lng) : null,
    rating: rating !== null ? Math.round(rating * 10) / 10 : null,
    review_count: Math.max(0, reviewCount),
    primary_type: raw.primaryType || (Array.isArray(raw.types) ? raw.types[0] : null),
    types: Array.isArray(raw.types) ? raw.types : [],
    website: raw.websiteUri || null,
    google_maps_url: raw.googleMapsUri || null,
  };
}

/**
 * Google Places API (New) Nearby Search
 * POST https://places.googleapis.com/v1/places:searchNearby
 */
export async function searchNearbyPlaces(
  params: NearbySearchParams
): Promise<NormalizedGooglePlace[]> {
  const apiKey = config.googleMapsApiKey;
  if (!apiKey) {
    logger.error("GOOGLE_MAPS_API_KEY is not configured in backend environment");
    throw new AppError("Google Places service is not currently configured.", 503);
  }

  const radius = Math.min(Math.max(params.radius || 5000, 100), 50000);
  const limit = Math.min(Math.max(params.limit || 20, 1), 20); // Places API maxResultCount max is 20 per call
  const rankPreference = params.rankPreference === "DISTANCE" ? "DISTANCE" : "POPULARITY";
  const category = params.category ? params.category.trim().toLowerCase() : undefined;

  // Check cache
  const cacheKey = `${params.latitude.toFixed(4)}:${params.longitude.toFixed(4)}:${radius}:${category || "all"}:${limit}:${rankPreference}`;
  if (!params.bypassCache) {
    const cached = nearbyCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.info(`[Google Places Cache HIT] nearby search: ${cacheKey}`);
      return cached.data;
    }
  }

  const requestBody: Record<string, any> = {
    locationRestriction: {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        radius,
      },
    },
    maxResultCount: limit,
    rankPreference,
  };

  if (category) {
    requestBody.includedTypes = [category];
  }

  let response: globalThis.Response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": NEARBY_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.message?.includes("aborted")) {
      logger.error("Google Places Nearby Search timed out after 15 seconds");
      throw new AppError("Google Places search timed out. Please try again shortly.", 504);
    }
    logger.error("Network error communicating with Google Places Nearby Search:", err);
    throw new AppError("Failed to communicate with Google Places service.", 502);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(`Google Places Nearby Search returned HTTP ${response.status}: ${errorText}`);

    if (response.status === 429) {
      throw new AppError("Google Places quota or rate limit exceeded. Please try again shortly.", 429);
    }
    if (response.status === 400) {
      throw new AppError("Invalid Google Places search parameters.", 400);
    }
    if (response.status === 403) {
      throw new AppError("Google Places API authorization error. Check API credentials.", 502);
    }
    throw new AppError("Failed to discover nearby places from Google Places.", 502);
  }

  const result = (await response.json()) as { places?: any[] };
  const rawPlaces = Array.isArray(result.places) ? result.places : [];

  const normalized = rawPlaces.map(normalizeGooglePlace).filter((p) => Boolean(p.place_id && p.name));

  // Store in cache
  nearbyCache.set(cacheKey, {
    data: normalized,
    expiresAt: Date.now() + NEARBY_CACHE_TTL_MS,
  });

  return normalized;
}

/**
 * Google Places API (New) Place Details
 * GET https://places.googleapis.com/v1/places/{PLACE_ID}
 */
export async function getPlaceDetails(
  placeId: string,
  bypassCache: boolean = false
): Promise<NormalizedGooglePlace> {
  const cleanId = placeId.trim().replace(/^places\//, "");
  if (!cleanId) {
    throw new AppError("A valid Google Place ID is required.", 400);
  }

  // Check in-memory cache
  if (!bypassCache) {
    const cached = detailsCache.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) {
      logger.info(`[Google Places Cache HIT] place details: ${cleanId}`);
      return cached.data;
    }
  }

  const apiKey = config.googleMapsApiKey;
  if (!apiKey) {
    logger.error("GOOGLE_MAPS_API_KEY is not configured in backend environment");
    throw new AppError("Google Places service is not currently configured.", 503);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
        },
        signal: AbortSignal.timeout(15_000),
      }
    );
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.message?.includes("aborted")) {
      logger.error(`Google Place Details timed out for ID: ${cleanId}`);
      throw new AppError("Google Place Details timed out. Please try again shortly.", 504);
    }
    logger.error(`Network error requesting Google Place Details for ${cleanId}:`, err);
    throw new AppError("Failed to communicate with Google Places service.", 502);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(`Google Place Details for ${cleanId} returned HTTP ${response.status}: ${errorText}`);

    if (response.status === 404) {
      throw new AppError(`Google Place not found with ID: ${cleanId}`, 404);
    }
    if (response.status === 400) {
      throw new AppError(`Invalid Google Place ID: ${cleanId}`, 400);
    }
    if (response.status === 429) {
      throw new AppError("Google Places quota or rate limit exceeded. Please try again shortly.", 429);
    }
    throw new AppError("Failed to fetch Google Place details.", 502);
  }

  const rawPlace = await response.json();
  const normalized = normalizeGooglePlace(rawPlace);

  // Store in cache
  detailsCache.set(cleanId, {
    data: normalized,
    expiresAt: Date.now() + DETAILS_CACHE_TTL_MS,
  });

  return normalized;
}

/**
 * Google Places API (New) Text Search
 * POST https://places.googleapis.com/v1/places:searchText
 * Dynamically resolves real geographic coordinates & Place ID from business name/query.
 */
export async function searchPlaceByText(
  textQuery: string
): Promise<NormalizedGooglePlace | null> {
  const apiKey = config.googleMapsApiKey;
  if (!apiKey || !textQuery?.trim()) return null;

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": NEARBY_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: textQuery.trim(),
        maxResultCount: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.warn(`Google Places Text Search returned HTTP ${response.status}: ${err}`);
      return null;
    }

    const result = (await response.json()) as { places?: any[] };
    const rawPlaces = Array.isArray(result.places) ? result.places : [];
    if (rawPlaces.length === 0) return null;

    const normalized = normalizeGooglePlace(rawPlaces[0]);
    return normalized.place_id ? normalized : null;
  } catch (err) {
    logger.warn("Google Places text search failed:", err);
    return null;
  }
}
