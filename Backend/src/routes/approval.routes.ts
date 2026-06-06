import { Router } from 'express';
import { recordApproval, getApprovals } from '../controllers/approval.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { get, all } from '../config/db';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin', 'officer', 'manager']), getApprovals);

// Retrieve approval/quotation details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await get<any>(
      `SELECT q.*, v.name as vendor_name, v.gst_number, r.title as rfq_title, r.rfq_number, r.deadline, r.description as rfq_desc,
              a.status as approval_status, a.remarks as approval_remarks
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       JOIN rfqs r ON q.rfq_id = r.id
       LEFT JOIN approvals a ON a.quotation_id = q.id
       WHERE q.id = ?`,
      [id]
    );

    if (!quote) {
      res.status(404).json({ success: false, error: 'Approval/Quotation not found' });
      return;
    }

    const items = await all('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
    quote.items = items;

    res.status(200).json({ success: true, data: { approval: quote } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  '/',
  authenticateToken,
  requireRole(['manager']),
  recordApproval
);

export default router;
