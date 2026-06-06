import { Request, Response } from 'express';
import { run, get, all } from '../config/db';
import { logActivity } from '../utils/logger';

const generatePoNumber = async (): Promise<string> => {
  const countRes = await get<{ count: number }>('SELECT count(*) as count FROM purchase_orders');
  const seq = String((countRes?.count || 0) + 1).padStart(4, '0');
  return `PO-2026-${seq}`;
};

export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rfq_id, quotation_id } = req.body;

    if (!rfq_id || !quotation_id) {
      res.status(400).json({ success: false, error: 'rfq_id and quotation_id are required' });
      return;
    }

    // 1. Fetch quotation to get the total amount
    const quote = await get<{ total_amount: number; status: string }>(
      'SELECT total_amount, status FROM quotations WHERE id = ?',
      [quotation_id]
    );

    if (!quote) {
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }

    if (quote.status !== 'selected') {
      res.status(400).json({
        success: false,
        error: `Cannot issue PO. The quotation must be 'selected' by a manager first (currently: '${quote.status}')`,
      });
      return;
    }

    const totalAmount = quote.total_amount;
    const poNumber = await generatePoNumber();

    // 2. Insert PO
    const result = await run(
      `INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, total_amount, status) 
       VALUES (?, ?, ?, ?, 'issued')`,
      [poNumber, rfq_id, quotation_id, totalAmount]
    );

    const executerId = req.user!.id;
    await logActivity(
      executerId,
      'PO_CREATED',
      'purchase_orders',
      result.lastID,
      `Purchase Order ${poNumber} generated for Quotation ID ${quotation_id}. Total: ${totalAmount}`
    );

    res.status(201).json({
      success: true,
      message: 'Purchase Order generated successfully',
      data: {
        poId: result.lastID,
        poNumber,
        totalAmount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPurchaseOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pos = await all(
      `SELECT po.*, r.title as rfq_title, v.name as vendor_name 
       FROM purchase_orders po
       JOIN rfqs r ON po.rfq_id = r.id
       JOIN quotations q ON po.quotation_id = q.id
       JOIN vendors v ON q.vendor_id = v.id
       ORDER BY po.id DESC`
    );
    res.status(200).json({ success: true, data: { pos } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
