import type { Request, Response, NextFunction } from "express";
import * as businessService from "../services/businessService";

export async function createBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.createBusiness(req.body);
    res.status(201).json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function getBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.getBusiness(req.params.id);
    res.json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function getAllBusinesses(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businesses = await businessService.getAllBusinesses();
    res.json({ status: "success", data: businesses });
  } catch (err) {
    next(err);
  }
}

export async function updateBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.updateBusiness(req.params.id, req.body);
    res.json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}
