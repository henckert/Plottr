import express, { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';
import { errorHandler } from './errors/middleware';
import { authMiddleware } from './middleware/auth';
import apiRoutes from './routes';

export default function createApp() {
  const app = express();
  app.use(express.json());

  // Health (no auth required)
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Auth middleware (applies to all /api routes)
  app.use('/api', authMiddleware);

  // API routes
  // mount the top-level router which includes /templates, /venues, /pitches, /sessions, /geocode
  app.use('/api', apiRoutes);

  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Route all errors through the centralized error handler
    errorHandler(err, req, res, next);
  });

  return app;
}
