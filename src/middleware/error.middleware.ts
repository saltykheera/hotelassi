import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err: err.message || err, stack: err.stack }, "Unhandled application error");

  const status = err.status || 500;
  res.status(status).json({
    error: err.name || "InternalServerError",
    message: err.message || "An unexpected error occurred",
  });
}

