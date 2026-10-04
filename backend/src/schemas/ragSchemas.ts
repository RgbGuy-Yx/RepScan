import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

export const chatFiltersSchema = z.object({
  platform: z.enum(["google", "instagram", "linkedin"]).optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  min_rating: z.number().min(1).max(5).optional(),
  max_rating: z.number().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  theme: z.string().optional(),
});

export const ragChatBodySchema = z
  .object({
    query: z.string().min(1, "Query cannot be empty").optional(),
    message: z.string().min(1, "Message cannot be empty").optional(),
    filters: chatFiltersSchema.optional(),
    conversation_history: z.array(chatMessageSchema).optional(),
    history: z.array(chatMessageSchema).optional(),
    session_id: z.string().optional(),
    thread_id: z.string().optional(),
  })
  .refine((data) => Boolean(data.query || data.message), {
    message: "Either 'query' or 'message' must be provided",
  });

export type ChatFilters = z.infer<typeof chatFiltersSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RagChatBody = z.infer<typeof ragChatBodySchema>;

export interface SourceProof {
  raw_item_id: string;
  platform: string;
  author: string | null;
  rating: number | null;
  date: string | null;
  source_url: string | null;
  excerpt: string;
}

export interface RagChatResult {
  answer: string;
  confidence: "High" | "Medium" | "Low";
  limitation_note: string | null;
  sources: SourceProof[];
  cached?: boolean;
  cache_key?: string;
}
