import { Router } from 'express';
import { createRfq, getRfqs, getRfqById, updateRfqStatus, compareQuotations } from '../controllers/rfq.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getRfqs);
router.get('/:id', authenticateToken, getRfqById);
router.get('/:id/compare', authenticateToken, requireRole(['admin', 'officer']), compareQuotations);

router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'officer']),
  createRfq
);

router.put(
  '/:id/status',
  authenticateToken,
  requireRole(['admin', 'officer']),
  updateRfqStatus
);

export default router;
