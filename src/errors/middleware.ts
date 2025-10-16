import { Request, Response, NextFunction } from 'express';
import { AppError } from './index';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error', err);
  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
