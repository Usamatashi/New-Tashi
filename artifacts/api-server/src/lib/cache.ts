import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Sets private HTTP cache for authenticated GET responses (mobile React Query also caches). */
export function privateCache(maxAgeSeconds: number): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", `private, max-age=${maxAgeSeconds}`);
    next();
  };
}
