import { z } from "zod";

export const nearbyCompetitorsQuerySchema = z.object({
  radius: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 5000))
    .refine((val) => !isNaN(val) && val >= 100 && val <= 50000, {
      message: "Radius must be a number between 100 and 50000 meters",
    }),
  category: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(100).optional(),
  rank: z
    .enum(["POPULARITY", "DISTANCE"])
    .optional()
    .default("POPULARITY"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 50, {
      message: "Limit must be a number between 1 and 50",
    }),
  latitude: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= -90 && val <= 90), {
      message: "Latitude must be between -90 and 90",
    }),
  longitude: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= -180 && val <= 180), {
      message: "Longitude must be between -180 and 180",
    }),
  bypass_cache: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
});

export interface NearbyCompetitorsQuery {
  radius?: number;
  category?: string;
  type?: string;
  rank?: "POPULARITY" | "DISTANCE";
  limit?: number;
  latitude?: number;
  longitude?: number;
  bypass_cache?: boolean;
}

export const trackCompetitorBodySchema = z.object({
  place_id: z.string().min(1, "place_id is required").max(255),
});

export type TrackCompetitorBody = z.infer<typeof trackCompetitorBodySchema>;

export const competitorIdParamSchema = z.object({
  competitorId: z.string().uuid("Invalid competitor ID format"),
});
