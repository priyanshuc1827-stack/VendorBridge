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

// 🔒 SECURE: Only logged-in users can view vendors
router.get('/', authenticateToken, getVendors);
router.get('/:id', authenticateToken, getVendorById);

// 🌐 PUBLIC: Removed token guards so new vendors can register themselves
router.post(
  '/',
  createVendor
);

// 🔒 SECURE: Only Admins or Officers can modify vendor details
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'officer']),
  updateVendor
);

// 🔒 SECURE: Only Admins can drop/delete vendor profiles
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  deleteVendor
);

export default router;