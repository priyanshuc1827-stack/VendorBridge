import { Router } from 'express';
import { createInvoice, getInvoices, downloadInvoice, emailInvoice } from '../controllers/invoice.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin', 'officer', 'manager', 'vendor']), getInvoices);
router.get('/:id/download', authenticateToken, downloadInvoice);

router.post(
  '/',
  authenticateToken,
  requireRole(['vendor']),
  createInvoice
);

router.post(
  '/:id/email',
  authenticateToken,
  emailInvoice
);

export default router;
