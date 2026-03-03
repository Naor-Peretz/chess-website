import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { services } from '../services/serviceContainer';
import type { ApiError } from '@chess-website/shared';

/**
 * Extracts the bearer token from the Authorization header or cookie.
 * Returns the token string, or an empty string if not present.
 */
function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  return '';
}

// Extend Express Request type to include user info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware to protect routes requiring authentication.
 * Extracts and validates JWT from Authorization header or cookie.
 * Validates tokenVersion against DB to support token revocation.
 * Attaches userId and userEmail to request object.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    // Always verify through the auth service - it handles empty/invalid tokens
    const payload = await services.authService.verifyToken(token);

    if (!payload) {
      const response: ApiError = {
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      };
      res.status(401).json(response);
      return;
    }

    // Attach user info to request
    req.userId = payload.userId;
    req.userEmail = payload.email;

    // Set Sentry user context for error tracking
    Sentry.setUser({
      id: payload.userId,
      email: payload.email,
    });

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'authMiddleware' },
    });

    const response: ApiError = {
      success: false,
      error: 'Authentication failed',
      code: 'UNAUTHORIZED',
    };
    res.status(401).json(response);
  }
}

/**
 * Optional auth middleware that attaches user info if token exists
 * but doesn't require authentication.
 * Validates tokenVersion against DB to support token revocation.
 * Useful for endpoints that behave differently for authenticated users.
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    // Always verify through the auth service - it handles empty/invalid tokens
    const payload = await services.authService.verifyToken(token);

    if (payload) {
      req.userId = payload.userId;
      req.userEmail = payload.email;

      Sentry.setUser({
        id: payload.userId,
        email: payload.email,
      });
    }

    next();
  } catch {
    // Silently continue without auth - this is optional middleware
    next();
  }
}
