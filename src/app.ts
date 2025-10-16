import express, { NextFunction, Request, Response } from 'express';
import templatesRoutes from './routes/templates.routes';

export default function createApp() {
  const app = express();
  app.use(express.json());

  // Health
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // API routes
  app.use('/api', templatesRoutes);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error', err);
    res.status(err?.status ?? 500).json({ error: { message: 'Internal Server Error' } });
  });

  return app;
}
