import { Router } from 'express';
import { submitQuotation, updateQuotationStatus } from '../controllers/quotation.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { get, all } from '../config/db';

const router = Router();

// Retrieve all quotations (optionally filtered by rfqId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rfqId } = req.query;
    let sql = `
      SELECT q.*, v.name as vendor_name, v.gst_number, r.title as rfq_title, r.rfq_number
      FROM quotations q
      JOIN vendors v ON q.vendor_id = v.id
      JOIN rfqs r ON q.rfq_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (rfqId) {
      sql += ' AND q.rfq_id = ?';
      params.push(Number(rfqId));
    }
    sql += ' ORDER BY q.id DESC';

    const list = await all<any>(sql, params);

    // Append line items for each quotation (necessary for comparative matrices)
    for (const q of list) {
      const items = await all('SELECT * FROM quotation_items WHERE quotation_id = ?', [q.id]);
      q.items = items;
    }

    res.status(200).json({ success: true, data: { quotations: list } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retrieve single quotation with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await get<any>(
      `SELECT q.*, v.name as vendor_name, v.gst_number, r.title as rfq_title, r.rfq_number, r.deadline, r.description as rfq_desc
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       JOIN rfqs r ON q.rfq_id = r.id
       WHERE q.id = ?`,
      [id]
    );

    if (!quote) {
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }

    const items = await all('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
    quote.items = items;

    res.status(200).json({ success: true, data: { quotation: quote } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
