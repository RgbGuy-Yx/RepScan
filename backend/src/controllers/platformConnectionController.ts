import type { Request, Response, NextFunction } from "express";
import * as platformService from "../services/platformConnectionService";

export async function connectPlatform(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const connection = await platformService.connectPlatform(
      req.params.id,
      req.body
    );
    res.status(201).json({ status: "success", data: connection });
  } catch (err) {
    next(err);
  }
}

export async function listPlatforms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const platforms = await platformService.listPlatforms(req.params.id);
    res.json({ status: "success", data: platforms });
  } catch (err) {
    next(err);
  }
}

export async function updatePlatformConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const connection = await platformService.updatePlatformConnection(
      req.params.id,
      req.params.platformId,
      req.body
    );
    res.json({ status: "success", data: connection });
  } catch (err) {
    next(err);
  }
}

export async function deletePlatformConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await platformService.deletePlatformConnection(
      req.params.id,
      req.params.platformId
    );
    res.json({ status: "success", message: "Platform connection deleted" });
  } catch (err) {
    next(err);
  }
}
