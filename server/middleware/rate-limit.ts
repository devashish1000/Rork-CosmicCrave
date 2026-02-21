import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

// In-memory rate limit store (for production, use Redis)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const scanRateLimitStore = new Map<string, RateLimitEntry>();
const apiRateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  scanRateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      scanRateLimitStore.delete(key);
    }
  });
  apiRateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      apiRateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limit for scan requests: 10 scans per minute per user
 */
export function scanRateLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next();
    return;
  }

  const key = `scan:${req.user.id}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const entry = scanRateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    scanRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    next();
    return;
  }

  if (entry.count >= maxRequests) {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many scan requests. Please wait a moment.',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  entry.count++;
  next();
}

/**
 * General API rate limit: 100 requests per 15 minutes per IP
 */
export function apiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `api:${ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  const entry = apiRateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    apiRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    next();
    return;
  }

  if (entry.count >= maxRequests) {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  entry.count++;
  next();
}
