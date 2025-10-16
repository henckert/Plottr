import express from 'express';
import routes from './routes';
import { errorHandler } from './errors/middleware';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', routes);

  // Error handler should be last
  app.use(errorHandler);

  return app;
}

export default createApp;
