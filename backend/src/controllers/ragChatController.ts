import type { Request, Response, NextFunction } from "express";
import { processRagChat } from "../services/ragChatService";

export async function handleRagChat(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const body = req.body;
    const query = (body.query || body.message || "").trim();
    const conversationHistory = body.conversation_history || body.history;
    const { filters, session_id, thread_id } = body;

    const result = await processRagChat({
      businessId,
      query,
      filters,
      conversationHistory,
      sessionId: session_id,
      threadId: thread_id,
    });

    const citations = (result.sources || []).map((s) => ({
      id: s.raw_item_id,
      author: s.author || "Verified Customer",
      rating: s.rating ?? 5,
      content: s.excerpt,
      published_at: s.date || new Date().toISOString(),
      platform: s.platform,
      source_url: s.source_url || null,
    }));

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
