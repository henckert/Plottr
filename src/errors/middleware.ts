import { Request, Response, NextFunction } from 'express';
import { AppError } from './index';
import { globalLogger } from '../lib/logger';

export interface RequestWithLogger extends Request {
  requestId?: string;
  logger?: any;
}

export function errorHandler(
  err: any,
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
) {
  const logger = req.logger || globalLogger;
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn('AppError handled', {
      requestId,
      message: err.message,
      code: err.code,
      status: err.status,
    });
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  // Handle PostgreSQL constraint violations
  if (err.code === '23503') {
    // FK constraint violation
    const message = `Foreign key constraint violation: ${err.constraint || 'unknown'}`;
    logger.warn('Database constraint violation', {
      requestId,
      constraint: 'FK',
      column: err.constraint,
    });
    res.status(400).json({ error: { message, code: 'FK_CONSTRAINT_VIOLATION' } });
    return;
  }

  if (err.code === '23505') {
    // Unique constraint violation
    const message = `Unique constraint violation: ${err.constraint || 'unknown'}`;
    logger.warn('Database constraint violation', {
      requestId,
      constraint: 'UNIQUE',
      column: err.constraint,
    });
    res.status(400).json({ error: { message, code: 'UNIQUE_CONSTRAINT_VIOLATION' } });
    return;
  }

  if (err.code === '23502') {
    // NOT NULL constraint violation
    const message = `NOT NULL constraint violation: ${err.column || 'unknown'}`;
    logger.warn('Database constraint violation', {
      requestId,
      constraint: 'NOT_NULL',
      column: err.column,
    });
    res.status(400).json({ error: { message, code: 'NOT_NULL_CONSTRAINT_VIOLATION' } });
    return;
  }

  // Unhandled error - log and return 500
  logger.error('Unhandled error', err, {
    requestId,
    errorCode: err.code,
    errorMessage: err.message,
  });

  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
