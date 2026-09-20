import type { Request, Response, NextFunction } from "express";
import { processRagChat } from "../services/ragChatService";

export async function handleRagChat(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const { query, filters, conversation_history, session_id, thread_id } = req.body;

    const result = await processRagChat({
      businessId,
      query,
      filters,
      conversationHistory: conversation_history,
      sessionId: session_id,
      threadId: thread_id,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
