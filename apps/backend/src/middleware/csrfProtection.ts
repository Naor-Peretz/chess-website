import { Request, Response, NextFunction } from 'express';
import { config } from '../config/unifiedConfig';
import type { ApiError } from '@chess-website/shared';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection middleware combining Origin validation and double-submit cookie verification.
 *
 * For mutating requests:
 * 1. Validates Origin header matches allowed CORS origin (OWASP recommended)
 * 2. Verifies X-CSRF-Token header matches csrf_token cookie (double-submit pattern)
 *
 * Server-to-server calls (BFF proxy) pass through as they don't carry Origin headers
 * and use JWT auth directly. The BFF layer also performs its own CSRF validation.
 *
 * Skipped in development/test environments.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (config.server.nodeEnv === 'development' || config.server.nodeEnv === 'test') {
    next();
    return;
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;

  // If Origin is present, it must match the allowed CORS origin
  if (origin && origin !== config.cors.origin) {
    const response: ApiError = {
      success: false,
      error: 'CSRF validation failed',
      code: 'FORBIDDEN',
    };
    res.status(403).json(response);
    return;
  }

  // Double-submit cookie verification: compare cookie token with header token
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];

  // If a CSRF cookie is present, the header must match (double-submit pattern)
  if (csrfCookie && csrfCookie !== csrfHeader) {
    const response: ApiError = {
      success: false,
      error: 'CSRF validation failed',
      code: 'FORBIDDEN',
    };
    res.status(403).json(response);
    return;
  }

  next();
}
