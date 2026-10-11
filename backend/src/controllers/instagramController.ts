import type { Request, Response, NextFunction } from "express";
import { instagramService } from "../services/instagramService";
import type { AddInstagramAccountBody } from "../schemas/instagramSchemas";

function extractBusinessId(req: Request): string {
  return req.params.id || req.params.businessId;
}

export async function addInstagramAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const body = req.body as AddInstagramAccountBody;

    const account = await instagramService.addAccount({
      businessId,
      urlOrUsername: body.urlOrUsername,
      competitorId: body.competitorId,
    });

    res.status(201).json({
      status: "success",
      data: account,
    });
  } catch (err) {
    next(err);
  }
}

export async function listInstagramAccountsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const competitorId = req.query.competitorId as string | undefined;

    const accounts = await instagramService.listAccounts(businessId, competitorId);

    res.json({
      status: "success",
      data: accounts,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInstagramAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;

    const account = await instagramService.getAccountById(businessId, accountId);

    res.json({
      status: "success",
      data: account,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInstagramSyncStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;

    const statusData = await instagramService.getSyncStatus(businessId, accountId);

    res.json({
      status: "success",
      data: statusData,
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerInstagramSyncHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;

    const syncRun = await instagramService.triggerSync(businessId, accountId);

    res.status(202).json({
      status: "success",
      message: "Instagram synchronization started in background",
      data: syncRun,
    });
  } catch (err) {
    next(err);
  }
}

export async function listInstagramPostsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const contentType = req.query.contentType as string | undefined;

    const result = await instagramService.listPosts(businessId, accountId, {
      limit,
      offset,
      contentType,
    });

    res.json({
      status: "success",
      data: result.posts,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
}

export async function listInstagramCommentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { postId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await instagramService.listComments(businessId, postId, {
      limit,
      offset,
    });

    res.json({
      status: "success",
      data: result.comments,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInstagramAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;

    const analytics = await instagramService.getAccountAnalytics(businessId, accountId);

    res.json({
      status: "success",
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteInstagramAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = extractBusinessId(req);
    const { accountId } = req.params;

    await instagramService.deleteAccount(businessId, accountId);

    res.json({
      status: "success",
      message: "Instagram account removed successfully",
    });
  } catch (err) {
    next(err);
  }
}
