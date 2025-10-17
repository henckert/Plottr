/**
 * HTTP request/response logging middleware
 * Tracks all HTTP requests with timing and error information
 */

import { Request, Response, NextFunction } from 'express';
import { globalLogger, generateRequestId, Logger } from '../lib/logger';

/**
 * Attach request ID and logger to request object
 */
export interface RequestWithLogger extends Request {
  requestId: string;
  logger: Logger;
  startTime?: number;
}

/**
 * Middleware to add request logging and correlation IDs
 */
export function requestLoggingMiddleware(
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
) {
  // Generate or extract request ID
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  req.requestId = requestId;

  // Create child logger with request context
  req.logger = globalLogger.child({
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id,
  });

  // Track start time for duration calculation
  req.startTime = Date.now();

  // Log incoming request
  req.logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Track response completion
  const originalJson = res.json;
  res.json = function (data: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    req.logger.info('Request completed', {
      status: res.statusCode,
      duration,
      contentLength: Buffer.byteLength(JSON.stringify(data)),
    });
    return originalJson.call(this, data);
  };

  // Add request ID to response headers for client correlation
  res.setHeader('x-request-id', requestId);

  next();
}

/**
 * Middleware to catch and log unhandled errors
 */
export function errorLoggingMiddleware(
  err: any,
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
) {
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  const logger = req.logger || globalLogger.child({
    requestId: req.requestId || 'unknown',
  });

  logger.error('Request failed', err, {
    status: err.status || 500,
    code: err.code || 'UNKNOWN_ERROR',
    duration,
    method: req.method,
    path: req.path,
  });

  next(err);
}
