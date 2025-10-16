import { Request, Response, NextFunction } from 'express';
import { AppError } from './index';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  // Handle PostgreSQL constraint violations
  if (err.code === '23503') {
    // FK constraint violation
    const message = `Foreign key constraint violation: ${err.constraint || 'unknown'}`;
    res.status(400).json({ error: { message, code: 'FK_CONSTRAINT_VIOLATION' } });
    return;
  }

  if (err.code === '23505') {
    // Unique constraint violation
    const message = `Unique constraint violation: ${err.constraint || 'unknown'}`;
    res.status(400).json({ error: { message, code: 'UNIQUE_CONSTRAINT_VIOLATION' } });
    return;
  }

  if (err.code === '23502') {
    // NOT NULL constraint violation
    const message = `NOT NULL constraint violation: ${err.column || 'unknown'}`;
    res.status(400).json({ error: { message, code: 'NOT_NULL_CONSTRAINT_VIOLATION' } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error', err);
  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
