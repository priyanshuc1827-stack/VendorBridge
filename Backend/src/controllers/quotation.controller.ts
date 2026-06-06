import { Request, Response } from 'express';
import { run, get } from '../config/db';
import { logActivity, createNotification } from '../utils/logger';

interface Quotation {
  id: number;
  rfq_id: number;
  vendor_id: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  delivery_days: number;
  notes: string | null;
  status: 'draft' | 'submitted' | 'selected' | 'rejected';
  is_selected: number;
}

export const submitQuotation = async (req: Request, res: Response): Promise<void> => {
  const { rfq_id, delivery_days, notes, items } = req.body;
  const vendorId = req.user!.vendor_id;

  if (!vendorId) {
    res.status(403).json({ success: false, error: 'Only user reps linked to a vendor account can bid' });
    return;
  }

  if (!rfq_id || !delivery_days || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'rfq_id, delivery_days, and a non-empty items array are required' });
    return;
  }

  try {
    // 1. Verify RFQ exists and is open
    const rfq = await get<{ status: string; created_by: number; title: string }>(
      'SELECT status, created_by, title FROM rfqs WHERE id = ?',
      [rfq_id]
    );
    if (!rfq) {
      res.status(404).json({ success: false, error: 'RFQ not found' });
      return;
    }
    if (rfq.status !== 'open') {
      res.status(400).json({ success: false, error: `RFQ is in '${rfq.status}' status (must be 'open' to quote)` });
      return;
    }

    // 2. Verify vendor invitation status
    const invite = await get('SELECT status FROM rfq_vendors WHERE rfq_id = ? AND vendor_id = ?', [rfq_id, vendorId]);
    if (!invite) {
      res.status(403).json({ success: false, error: 'Access denied: your vendor was not invited to this RFQ' });
      return;
    }

    // 3. Compute pricing totals
    let computedSubtotal = 0;
    const itemsToInsert: any[] = [];

    for (const item of items) {
      if (!item.rfq_item_id || !item.product_name || item.quantity === undefined || item.unit_price === undefined) {
        res.status(400).json({ success: false, error: 'Each quotation item must contain rfq_item_id, product_name, quantity, and unit_price' });
        return;
      }
      const itemTotalPrice = item.quantity * item.unit_price;
      computedSubtotal += itemTotalPrice;

      itemsToInsert.push({
        rfq_item_id: item.rfq_item_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: itemTotalPrice,
      });
    }

    const taxRate = 18.0;
    const taxAmount = computedSubtotal * (taxRate / 100.0);
    const totalAmount = computedSubtotal + taxAmount;

    // 4. Begin transaction
    await run('BEGIN TRANSACTION');

    // Create quotation
    const quoteInsert = await run(
      `INSERT INTO quotations (rfq_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, delivery_days, notes, status, is_selected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 0)`,
      [rfq_id, vendorId, computedSubtotal, taxRate, taxAmount, totalAmount, delivery_days, notes || null]
    );
    const quotationId = quoteInsert.lastID;

    // Insert items
    for (const item of itemsToInsert) {
      await run(
        `INSERT INTO quotation_items (quotation_id, rfq_item_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [quotationId, item.rfq_item_id, item.product_name, item.quantity, item.unit_price, item.total_price]
      );
    }

    // Update invitation status to submitted
    await run('UPDATE rfq_vendors SET status = "submitted" WHERE rfq_id = ? AND vendor_id = ?', [rfq_id, vendorId]);

    // Notify Procurement Officer
    await createNotification(
      rfq.created_by,
      'New Quote Submitted',
      `A new quotation of total amount ${totalAmount} was submitted for your RFQ "${rfq.title}".`
    );

    await run('COMMIT');

    // Audit log
    await logActivity(
      req.user!.id,
      'QUOTATION_SUBMITTED',
      'quotations',
      quotationId,
      `Quotation submitted by vendor for RFQ ID ${rfq_id}. Subtotal: ${computedSubtotal}`
    );

    res.status(201).json({
      success: true,
      message: 'Quotation submitted successfully',
      data: { quotationId },
    });
  } catch (error: any) {
    await run('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateQuotationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['draft', 'submitted', 'selected', 'rejected'];
    if (!status || !valid.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${valid.join(', ')}` });
      return;
    }

    const quote = await get<Quotation>('SELECT rfq_id, status FROM quotations WHERE id = ?', [id]);
    if (!quote) {
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }

    await run('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);

    if (status === 'selected') {
      await run('UPDATE quotations SET is_selected = 1 WHERE id = ?', [id]);
    }

    const executerId = req.user!.id;
    await logActivity(
      executerId,
      'QUOTATION_STATUS_UPDATED',
      'quotations',
      Number(id),
      `Quotation status updated from "${quote.status}" to "${status}".`
    );

    res.status(200).json({ success: true, message: `Quotation status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
