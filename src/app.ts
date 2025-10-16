import express, { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';
import { errorHandler } from './errors/middleware';
import apiRoutes from './routes';

export default function createApp() {
  const app = express();
  app.use(express.json());

  // Health
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // API routes
  // mount the top-level router which includes /templates, /venues, /pitches, /sessions, /geocode
  app.use('/api', apiRoutes);

  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      return errorHandler(err, req, res, next);
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled error', err);
    res.status(err?.status ?? 500).json({ error: { message: 'Internal Server Error' } });
  });

  return app;
}
