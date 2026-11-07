import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly hits = new Map<string, RateRecord>();

  constructor() {
    // Periodic garbage collection every 5 minutes to prevent memory leak
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now > record.resetAt) {
          this.hits.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const targetUrl = req.originalUrl || req.url || req.path || '';
    const isSensitive =
      targetUrl.includes('analyze-and-create') ||
      targetUrl.includes('time-warp') ||
      targetUrl.includes('token');

    const maxRequests = isSensitive ? 30 : 180;
    const windowMs = 60 * 1000;
    const now = Date.now();

    const key = `${ip}:${isSensitive ? 'sensitive' : 'standard'}`;
    const record = this.hits.get(key);

    if (!record || now > record.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        status_code: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests, please slow down',
        retry_after_seconds: retryAfterSec,
      });
      return;
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    next();
  }
}
