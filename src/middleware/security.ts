import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authenticated endpoints (stricter)
 * 15 requests per minute per IP for auth-required endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 requests per windowMs
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Rate limiter for public endpoints (looser)
 * 100 requests per minute per IP for public endpoints
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Helmet security middleware configuration
 * Secures Express app by setting various HTTP headers
 */
export function setupHelmet(app: Express): void {
  app.use(
    helmet({
      // Content Security Policy: prevent XSS attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      // HTTP Strict Transport Security: force HTTPS in production
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      // X-Frame-Options: prevent clickjacking
      frameguard: {
        action: 'deny',
      },
      // X-Content-Type-Options: prevent MIME sniffing
      noSniff: true,
      // Referrer-Policy: control referrer information
      referrerPolicy: {
        policy: 'no-referrer',
      },
      // Remove X-Powered-By header
      hidePoweredBy: true,
    })
  );
}

/**
 * Sanitize string input to prevent XSS and injection
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return (
    str
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Escape HTML entities (minimal)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  );
}

/**
 * Input sanitization middleware
 * Removes potential SQL injection and XSS patterns from user input
 */
export function sanitizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Sanitize query params - escape HTML special characters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    });
  }

  // Body sanitization is applied via Zod schemas in route handlers
  next();
}

/**
 * Setup all security middleware
 */
export function setupSecurityMiddleware(app: Express): void {
  // Apply Helmet security headers  
  setupHelmet(app);
  
  // Apply sanitization middleware for query params
  app.use(sanitizationMiddleware);
}
