import express from 'express';
import {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
} from '../controllers/assets.controller';

const router = express.Router();

/**
 * Assets Routes
 * 
 * GET    /api/assets           - List assets with filters (layout_id, zone_id, asset_type)
 * POST   /api/assets           - Create new asset
 * GET    /api/assets/:id       - Get single asset
 * PUT    /api/assets/:id       - Update asset (requires If-Match header)
 * DELETE /api/assets/:id       - Delete asset (requires If-Match header)
 */

router.get('/', listAssets);
router.post('/', createAsset);
router.get('/:id', getAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;
