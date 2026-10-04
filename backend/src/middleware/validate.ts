import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodObject } from "zod";
import { AppError } from "./errorHandler";

export function validate(schema: ZodSchema, source?: "body" | "query" | "params") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // If source is explicitly specified, validate that specific part of the request
    if (source) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const message = result.error.errors.map((e) => e.message).join(", ");
        next(new AppError(`Validation error: ${message}`, 400));
        return;
      }
      req[source] = result.data;
      next();
      return;
    }

    // If schema has top-level keys like 'body', 'query', or 'params', validate against composite object
    if (schema instanceof ZodObject) {
      const shape = schema.shape;
      if ("body" in shape || "query" in shape || "params" in shape) {
        const result = schema.safeParse({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (!result.success) {
          const message = result.error.errors.map((e) => e.message).join(", ");
          next(new AppError(`Validation error: ${message}`, 400));
          return;
        }
        if (result.data.body !== undefined) req.body = result.data.body;
        if (result.data.query !== undefined) (req as any).query = result.data.query;
        if (result.data.params !== undefined) (req as any).params = result.data.params;
        next();
        return;
      }
    }

    // Default fallback: validate req.query for GET/DELETE, req.body for POST/PUT/PATCH
    const isQueryMethod = req.method === "GET" || req.method === "DELETE";
    const target = isQueryMethod ? req.query : req.body;
    const result = schema.safeParse(target);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      next(new AppError(`Validation error: ${message}`, 400));
      return;
    }
    if (isQueryMethod) {
      (req as any).query = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
