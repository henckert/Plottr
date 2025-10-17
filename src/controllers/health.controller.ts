/**
 * Health check endpoint
 * Verifies database connectivity and application readiness
 */

import { Request, Response } from 'express';
import { getKnex } from '../data/knex';
import { RequestWithLogger } from '../middleware/logging';

export interface HealthCheckResponse {
  ok: boolean;
  timestamp: string;
  uptime: number;
  database?: {
    healthy: boolean;
    latency?: number;
  };
  environment: string;
  version: string;
}

/**
 * Simple health check - just returns ok
 */
export function healthCheck(req: RequestWithLogger, res: Response) {
  const response: HealthCheckResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '0.1.0',
  };

  req.logger?.info('Health check request', { response });
  res.json(response);
}

/**
 * Detailed health check - includes database connectivity
 * Used by monitoring systems to verify full application health
 */
export async function healthCheckDetailed(
  req: RequestWithLogger,
  res: Response
): Promise<void> {
  const response: HealthCheckResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '0.1.0',
  };

  try {
    // Test database connectivity
    const dbStartTime = Date.now();
    const knex = getKnex();
    await knex.raw('SELECT 1');
    const dbLatency = Date.now() - dbStartTime;

    response.database = {
      healthy: true,
      latency: dbLatency,
    };

    req.logger?.info('Detailed health check passed', {
      dbLatency,
      uptime: response.uptime,
    });

    res.json(response);
  } catch (error) {
    response.ok = false;
    response.database = { healthy: false };

    req.logger?.error('Health check failed - database unreachable', error as Error, {
      error: (error as Error).message,
    });

    res.status(503).json(response);
  }
}

/**
 * Readiness probe for Kubernetes/Docker orchestration
 * Returns 200 only when ready to accept traffic
 */
export async function readinessProbe(
  req: RequestWithLogger,
  res: Response
): Promise<void> {
  try {
    const knex = getKnex();
    await knex.raw('SELECT 1');
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
}

/**
 * Liveness probe for Kubernetes/Docker orchestration
 * Returns 200 if service is running (not necessarily healthy)
 */
export function livenessProbe(req: RequestWithLogger, res: Response) {
  res.json({ alive: true });
}
