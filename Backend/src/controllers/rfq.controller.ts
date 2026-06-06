import { Request, Response } from 'express';
import { run, get, all } from '../config/db';
import { logActivity, createNotification } from '../utils/logger';

interface RFQ {
  id: number;
  rfq_number: string;
  title: string;
  description: string;
  deadline: string;
  status: 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled';
  created_by: number;
}

export const createRfq = async (req: Request, res: Response): Promise<void> => {
  const { title, description, deadline, items, vendorIds } = req.body;
  const createdBy = req.user!.id;

  if (!title || !deadline || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'Title, deadline, and a non-empty items array are required' });
    return;
  }

  try {
    // 1. Begin transaction
    await run('BEGIN TRANSACTION');

    // 2. Generate sequential RFQ Number
    const countRes = await get<{ count: number }>('SELECT count(*) as count FROM rfqs');
    const seq = String((countRes?.count || 0) + 1).padStart(4, '0');
    const rfqNumber = `RFQ-2026-${seq}`;

    // 3. Insert RFQ
    const rfqInsert = await run(
      `INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by)
       VALUES (?, ?, ?, ?, 'open', ?)`,
      [rfqNumber, title, description || null, deadline, createdBy]
    );
    const rfqId = rfqInsert.lastID;

    // 4. Insert items
    for (const item of items) {
      if (!item.product_name || !item.quantity || !item.unit) {
        throw new Error('All RFQ items must contain product_name, quantity, and unit');
      }
      await run(
        `INSERT INTO rfq_items (rfq_id, product_name, quantity, unit) 
         VALUES (?, ?, ?, ?)`,
        [rfqId, item.product_name, item.quantity, item.unit]
      );
    }

    // 5. Invite vendors
    if (vendorIds && Array.isArray(vendorIds)) {
      for (const vId of vendorIds) {
        const vendor = await get('SELECT id FROM vendors WHERE id = ?', [vId]);
        if (!vendor) {
          throw new Error(`Vendor ID ${vId} does not exist`);
        }
        await run(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, status) 
           VALUES (?, ?, 'invited')`,
          [rfqId, vId]
        );

        // Fetch vendor rep users to alert
        const vendorUsers = await all<{ id: number }>('SELECT id FROM users WHERE vendor_id = ?', [vId]);
        for (const vUser of vendorUsers) {
          await createNotification(
            vUser.id,
            'New RFQ Invited',
            `You have been invited to quote for RFQ ${rfqNumber}: "${title}".`
          );
        }
      }
    }

    await run('COMMIT');

    // Log action
    await logActivity(
      createdBy,
      'RFQ_CREATED',
      'rfqs',
      rfqId,
      `RFQ "${title}" (${rfqNumber}) created with ${items.length} items.`
    );

    res.status(201).json({
      success: true,
      message: 'RFQ created and vendors invited successfully',
      data: { rfqId, rfqNumber },
    });
  } catch (error: any) {
    await run('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRfqs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*, u.name as creator_name,
             (SELECT count(*) FROM rfq_items WHERE rfq_id = r.id) as item_count,
             (SELECT count(*) FROM rfq_vendors WHERE rfq_id = r.id) as invited_vendors
      FROM rfqs r
      JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.rfq_number DESC';
    const rfqs = await all<any>(sql, params);
    res.status(200).json({ success: true, data: { rfqs } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRfqById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rfq = await get<any>(
      `SELECT r.*, u.name as creator_name 
       FROM rfqs r 
       JOIN users u ON r.created_by = u.id 
       WHERE r.id = ?`,
      [id]
    );

    if (!rfq) {
      res.status(404).json({ success: false, error: 'RFQ not found' });
      return;
    }

    // Fetch items
    const items = await all('SELECT * FROM rfq_items WHERE rfq_id = ?', [id]);
    rfq.items = items;

    // Fetch invited vendors
    const vendors = await all(
      `SELECT rv.status, v.id as vendor_id, v.name as vendor_name, v.category
       FROM rfq_vendors rv
       JOIN vendors v ON rv.vendor_id = v.id
       WHERE rv.rfq_id = ?`,
      [id]
    );
    rfq.invitedVendors = vendors;

    res.status(200).json({ success: true, data: { rfq } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateRfqStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['draft', 'open', 'closed', 'awarded', 'cancelled'];
    if (!status || !valid.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${valid.join(', ')}` });
      return;
    }

    const rfq = await get<RFQ>('SELECT status FROM rfqs WHERE id = ?', [id]);
    if (!rfq) {
      res.status(404).json({ success: false, error: 'RFQ not found' });
      return;
    }

    await run('UPDATE rfqs SET status = ? WHERE id = ?', [status, id]);

    const executerId = req.user!.id;
    await logActivity(
      executerId,
      'RFQ_STATUS_UPDATED',
      'rfqs',
      Number(id),
      `RFQ status updated from "${rfq.status}" to "${status}".`
    );

    res.status(200).json({ success: true, message: `RFQ status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * aggregates all quotations for a target RFQ side-by-side, sorted by lowest total price.
 */
export const compareQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // RFQ ID

    // Verify RFQ
    const rfq = await get('SELECT id, title, rfq_number, status FROM rfqs WHERE id = ?', [id]);
    if (!rfq) {
      res.status(404).json({ success: false, error: 'RFQ not found' });
      return;
    }

    // Fetch quotations sorted by lowest total_amount
    const quotations = await all<any>(
      `SELECT q.*, v.name as vendor_name, v.gst_number
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       WHERE q.rfq_id = ?
       ORDER BY q.total_amount ASC`,
      [id]
    );

    // Fetch items for each quote
    for (const q of quotations) {
      const items = await all('SELECT * FROM quotation_items WHERE quotation_id = ?', [q.id]);
      q.items = items;
    }

    res.status(200).json({
      success: true,
      data: {
        rfq,
        comparison: quotations,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
