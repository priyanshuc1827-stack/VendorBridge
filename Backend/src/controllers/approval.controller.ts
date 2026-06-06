import { Request, Response } from 'express';
import { run, get, all } from '../config/db';
import { logActivity, createNotification } from '../utils/logger';

interface Quotation {
  id: number;
  rfq_id: number;
  vendor_id: number;
  total_amount: number;
  status: string;
}

export const recordApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotation_id, status, remarks } = req.body;
    const managerId = req.user!.id;

    if (!quotation_id || !status) {
      res.status(400).json({ success: false, error: 'quotation_id and status are required' });
      return;
    }

    const valid = ['approved', 'rejected'];
    if (!valid.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${valid.join(', ')}` });
      return;
    }

    // MANDATORY remarks check for status = 'rejected'
    if (status === 'rejected' && (!remarks || remarks.trim() === '')) {
      res.status(400).json({
        success: false,
        error: 'Remarks are mandatory when rejecting a quotation approval',
      });
      return;
    }

    // 1. Fetch quotation details
    const quotation = await get<Quotation>('SELECT * FROM quotations WHERE id = ?', [quotation_id]);
    if (!quotation) {
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }

    const rfqId = quotation.rfq_id;

    // 2. Begin transaction
    await run('BEGIN TRANSACTION');

    // Create approval record
    const approvalInsert = await run(
      `INSERT INTO approvals (quotation_id, rfq_id, status, remarks) 
       VALUES (?, ?, ?, ?)`,
      [quotation_id, rfqId, status, remarks || null]
    );
    const approvalId = approvalInsert.lastID;

    // 3. Transition quotation and RFQ states based on action
    if (status === 'approved') {
      await run('UPDATE quotations SET status = "selected", is_selected = 1 WHERE id = ?', [quotation_id]);
      await run('UPDATE rfqs SET status = "closed" WHERE id = ?', [rfqId]);

      // Notify vendor about selection
      const vendorRep = await get<{ id: number }>('SELECT id FROM users WHERE vendor_id = ?', [quotation.vendor_id]);
      if (vendorRep) {
        await createNotification(
          vendorRep.id,
          'Bid Selected',
          `Your quotation for RFQ ID ${rfqId} has been selected and approved.`
        );
      }
    } else {
      await run('UPDATE quotations SET status = "rejected" WHERE id = ?', [quotation_id]);
    }

    await run('COMMIT');

    // Log Activity
    await logActivity(
      managerId,
      'APPROVAL_RECORDED',
      'approvals',
      approvalId,
      `Manager evaluated Quotation ID ${quotation_id}. Decision: ${status}.`
    );

    res.status(201).json({
      success: true,
      message: `Quotation evaluation recorded as ${status}`,
      data: { approvalId, status },
    });
  } catch (error: any) {
    await run('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getApprovals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const approvals = await all(
      `SELECT a.*, r.title as rfq_title, q.total_amount, v.name as vendor_name
       FROM approvals a
       JOIN rfqs r ON a.rfq_id = r.id
       JOIN quotations q ON a.quotation_id = q.id
       JOIN vendors v ON q.vendor_id = v.id
       ORDER BY a.id DESC`
    );
    res.status(200).json({ success: true, data: { approvals } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
