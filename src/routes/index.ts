import { Router } from 'express';
import auth from './auth.routes';
import webhooks from './webhooks.routes';
import templates from './templates.routes';
import venues from './venues.routes';
import pitches from './pitches.routes';
import sessions from './sessions.routes';
import geocode from './geocode.routes';
import layouts from './layouts.routes';
import sites from './sites.routes';
import zones from './zones.routes';
import usage from './usage.routes';
import createGeometryRoutes from './geometry.routes';
import test from './test.routes';

const router = Router();

router.use('/auth', auth);
router.use('/webhooks/clerk', webhooks);
router.use('/templates', templates);
router.use('/layouts', layouts);
router.use('/sites', sites);
router.use('/zones', zones);
router.use('/venues', venues);
router.use('/pitches', pitches);
router.use('/sessions', sessions);
router.use('/geocode', geocode);
router.use('/usage', usage);
router.use('/geometries', createGeometryRoutes());

// Test-only routes (only available when E2E=true)
if (process.env.E2E === 'true') {
  router.use('/test', test);
  // eslint-disable-next-line no-console
  console.log('🧪 E2E test routes enabled at /api/test');
}

export default router;
