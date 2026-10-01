import { z } from "zod";

const PLATFORM_ENUM = z.enum(["google", "instagram", "linkedin"]);

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  industry: z.string().max(255).optional().nullable(),
  website: z.string().url("website must be a valid URL").optional().nullable().or(z.literal("")),
  location: z.string().max(255).optional().nullable(),
});

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  industry: z.string().max(255).optional().nullable(),
  website: z.string().url("website must be a valid URL").optional().nullable().or(z.literal("")),
  location: z.string().max(255).optional().nullable(),
});

export const createPlatformConnectionSchema = z.object({
  platform: PLATFORM_ENUM,
  source_url: z.string().url("source_url must be a valid URL"),
  external_id: z.string().max(255).optional(),
});

export const updatePlatformConnectionSchema = z.object({
  is_active: z.boolean().optional(),
  source_url: z.string().url("source_url must be a valid URL").optional(),
  external_id: z.string().max(255).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreatePlatformConnectionInput = z.infer<typeof createPlatformConnectionSchema>;
export type UpdatePlatformConnectionInput = z.infer<typeof updatePlatformConnectionSchema>;
