import { z } from "zod";

export const addInstagramAccountSchema = z.object({
  body: z.object({
    urlOrUsername: z.string().min(1, "Instagram profile URL or handle is required"),
    competitorId: z.string().uuid("Invalid competitor UUID format").optional().nullable(),
  }),
});

export const listInstagramAccountsQuerySchema = z.object({
  query: z.object({
    competitorId: z.string().uuid().optional(),
  }),
});

export const listInstagramPostsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
    contentType: z.string().optional(),
  }),
});

export const listInstagramCommentsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  }),
});

export type AddInstagramAccountBody = z.infer<typeof addInstagramAccountSchema>["body"];
