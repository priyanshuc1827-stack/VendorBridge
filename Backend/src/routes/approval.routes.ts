import { Router } from 'express';
import { recordApproval, getApprovals } from '../controllers/approval.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin', 'officer', 'manager']), getApprovals);

router.post(
  '/',
  authenticateToken,
  requireRole(['manager']),
  recordApproval
);

export default router;
