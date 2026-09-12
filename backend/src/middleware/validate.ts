import type { Request, Response, NextFunction } from "express";
import { type ZodSchema } from "zod";
import { AppError } from "./errorHandler";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      next(new AppError(`Validation error: ${message}`, 400));
      return;
    }
    req.body = result.data;
    next();
  };
}
