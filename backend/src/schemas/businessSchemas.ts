import { z } from "zod";

const PLATFORM_ENUM = z.preprocess(
  (val) => (val === "google_maps" ? "google" : val),
  z.enum(["google", "instagram", "linkedin"])
);

const OPTIONAL_URL = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }
  return val;
}, z.string().url("website must be a valid URL").optional().nullable().or(z.literal("")));

const REQUIRED_URL = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }
  return val;
}, z.string().url("source_url must be a valid URL"));

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  industry: z.string().max(255).optional().nullable(),
  website: OPTIONAL_URL,
  location: z.string().max(255).optional().nullable(),
});

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  industry: z.string().max(255).optional().nullable(),
  website: OPTIONAL_URL,
  location: z.string().max(255).optional().nullable(),
});

export const createPlatformConnectionSchema = z.object({
  platform: PLATFORM_ENUM,
  source_url: REQUIRED_URL,
  external_id: z.string().max(255).optional(),
});

export const updatePlatformConnectionSchema = z.object({
  is_active: z.boolean().optional(),
  source_url: REQUIRED_URL.optional(),
  external_id: z.string().max(255).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreatePlatformConnectionInput = z.infer<typeof createPlatformConnectionSchema>;
export type UpdatePlatformConnectionInput = z.infer<typeof updatePlatformConnectionSchema>;
