import { Router } from 'express';
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from '../controllers/vendor.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getVendors);
router.get('/:id', authenticateToken, getVendorById);

router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'officer']),
  createVendor
);

router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'officer']),
  updateVendor
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  deleteVendor
);

export default router;
