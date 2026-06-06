import { Router } from 'express';
import { submitQuotation, updateQuotationStatus } from '../controllers/quotation.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  authenticateToken,
  requireRole(['vendor']),
  submitQuotation
);

router.put(
  '/:id/status',
  authenticateToken,
  requireRole(['admin', 'officer']),
  updateQuotationStatus
);

export default router;
