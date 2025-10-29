import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AppError } from './errors';
import { errorHandler } from './errors/middleware';
import { authMiddleware } from './middleware/auth';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { makeRateLimiter } from './middleware/rateLimitBypass';
import { healthCheck, healthCheckDetailed, readinessProbe, livenessProbe } from './controllers/health.controller';
import { getPublicShareView } from './controllers/share-links.controller';
import apiRoutes from './routes';

// Rate limiters with E2E bypass
const authLimiter = makeRateLimiter(60 * 1000, 15); // 15 req/min
const publicLimiter = makeRateLimiter(60 * 1000, 100); // 100 req/min

// Load OpenAPI spec
let swaggerDocument: any = null;
try {
  const openapiPath = path.resolve(__dirname, '../openapi/plottr.yaml');
  const fileContents = fs.readFileSync(openapiPath, 'utf8');
  swaggerDocument = yaml.load(fileContents);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('Failed to load OpenAPI spec:', err);
}

export default function createApp() {
  const app = express();

  // Request logging middleware (must be first to capture all requests)
  app.use(requestLoggingMiddleware as any);

  // CORS middleware (must be before routes)
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  // Helmet security headers (must be before routes)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI requires inline styles
          scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI requires inline scripts
          imgSrc: ["'self'", 'data:', 'https:', 'validator.swagger.io'],
          fontSrc: ["'self'", 'data:'],
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

  // Public share link view (no auth required)
  app.get('/share/:slug', publicLimiter, getPublicShareView as any);

  // API Documentation (Swagger UI)
  if (swaggerDocument) {
    // Customize Swagger UI options
    const swaggerUiOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Plottr API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    };

    app.use(
      '/api/docs',
      publicLimiter,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, swaggerUiOptions)
    );

    // Also serve raw OpenAPI spec at /api/openapi.json
    app.get('/api/openapi.json', publicLimiter, (req, res) => {
      res.json(swaggerDocument);
    });

    // Serve raw OpenAPI YAML spec at /api/openapi.yaml
    app.get('/api/openapi.yaml', publicLimiter, (req, res) => {
      res.type('text/yaml');
      const openapiPath = path.resolve(__dirname, '../openapi/plottr.yaml');
      res.sendFile(openapiPath);
    });

    // eslint-disable-next-line no-console
    console.log('API documentation available at /api/docs');
  } else {
    // eslint-disable-next-line no-console
    console.warn('API documentation unavailable - OpenAPI spec failed to load');
  }

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
