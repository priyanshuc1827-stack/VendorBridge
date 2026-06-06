import { Router } from 'express';
import { createPurchaseOrder, getPurchaseOrders } from '../controllers/purchaseOrder.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin', 'officer', 'manager', 'vendor']), getPurchaseOrders);

router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'officer']),
  createPurchaseOrder
);

export default router;
