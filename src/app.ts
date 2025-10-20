import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { AppError } from './errors';
import { errorHandler } from './errors/middleware';
import { authMiddleware } from './middleware/auth';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { healthCheck, healthCheckDetailed, readinessProbe, livenessProbe } from './controllers/health.controller';
import apiRoutes from './routes';

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

export default function createApp() {
  const app = express();

  // Request logging middleware (must be first to capture all requests)
  app.use(requestLoggingMiddleware as any);

  // Helmet security headers (must be before routes)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
      hidePoweredBy: true,
    })
  );

  app.use(express.json());

  // Configure multer for file uploads (5MB max) - for /api/geometries/import endpoint
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      // Only allow GeoJSON and KML files
      const allowedMimes = ['application/json', 'application/xml', 'text/xml', 'text/plain'];
      const allowedExtensions = ['.geojson', '.json', '.kml', '.xml'];
      
      const fileName = file.originalname.toLowerCase();
      const isAllowedExt = allowedExtensions.some(ext => fileName.endsWith(ext));
      const isAllowedMime = allowedMimes.includes(file.mimetype);
      
      if (isAllowedExt || isAllowedMime) {
        cb(null, true);
      } else {
        // Return AppError with 400 status instead of generic Error
        const error = new AppError(
          'Only GeoJSON (.geojson, .json) and KML (.kml, .xml) files are allowed',
          400,
          'INVALID_FILETYPE'
        );
        cb(error as any);
      }
    },
  });

  app.post('/api/geometries/import', upload.single('file'));

  // Health check endpoints (no auth required)
  app.get('/health', publicLimiter, healthCheck as any);
  app.get('/healthz', publicLimiter, healthCheckDetailed as any);
  app.get('/ready', publicLimiter, readinessProbe as any);
  app.get('/live', publicLimiter, livenessProbe as any);

  // Auth middleware (applies to all /api routes)
  // Wrap async middleware to catch promise rejections
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(authMiddleware(req as any, res, next)).catch(next);
  });

  // Apply stricter rate limiting to authenticated API endpoints
  app.use('/api', authLimiter);

  // API routes
  // mount the top-level router which includes /templates, /venues, /pitches, /sessions, /geocode
  app.use('/api', apiRoutes);

  // Error logging middleware (before error handler)
  app.use(errorLoggingMiddleware as any);

  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Route all errors through the centralized error handler
    errorHandler(err, req, res, next);
  });

  return app;
}
