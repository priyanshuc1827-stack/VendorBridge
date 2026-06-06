import { Request, Response } from 'express';
import { run, get, all } from '../config/db';
import { logActivity } from '../utils/logger';

interface Invoice {
  id: number;
  invoice_number: string;
  po_id: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'generated' | 'sent' | 'paid' | 'void';
  due_date: string;
}

const generateInvoiceNumber = async (): Promise<string> => {
  const countRes = await get<{ count: number }>('SELECT count(*) as count FROM invoices');
  const seq = String((countRes?.count || 0) + 1).padStart(4, '0');
  return `INV-2026-${seq}`;
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { po_id, due_date } = req.body;
    const vendorId = req.user!.vendor_id;

    if (!vendorId) {
      res.status(403).json({ success: false, error: 'Only vendors can generate invoices' });
      return;
    }

    if (!po_id || !due_date) {
      res.status(400).json({ success: false, error: 'po_id and due_date are required' });
      return;
    }

    // 1. Fetch PO and make sure it belongs to this vendor
    const po = await get<{ total_amount: number; id: number; vendor_id: number }>(
      `SELECT po.*, q.vendor_id 
       FROM purchase_orders po
       JOIN quotations q ON po.quotation_id = q.id
       WHERE po.id = ?`,
      [po_id]
    );

    if (!po) {
      res.status(404).json({ success: false, error: 'Purchase Order not found' });
      return;
    }

    if (po.vendor_id !== vendorId) {
      res.status(403).json({ success: false, error: 'Access denied: this Purchase Order is issued to another vendor.' });
      return;
    }

    // Check if invoice already generated for this PO
    const existing = await get('SELECT id, invoice_number FROM invoices WHERE po_id = ?', [po_id]);
    if (existing) {
      res.status(400).json({ success: false, error: `Invoice already generated for this PO (ID: ${po_id})` });
      return;
    }

    // Auto-calculate GST tax (18% tax logic)
    const subtotal = po.total_amount;
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = await generateInvoiceNumber();

    // 2. Insert invoice
    const result = await run(
      `INSERT INTO invoices (invoice_number, po_id, subtotal, tax_amount, total_amount, status, due_date) 
       VALUES (?, ?, ?, ?, ?, 'generated', ?)`,
      [invoiceNumber, po_id, subtotal, taxAmount, totalAmount, due_date]
    );

    await logActivity(
      req.user!.id,
      'INVOICE_GENERATED',
      'invoices',
      result.lastID,
      `Generated Invoice ${invoiceNumber} for PO ID ${po_id}. Total: ${totalAmount}`
    );

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoiceId: result.lastID,
        invoiceNumber,
        subtotal,
        taxAmount,
        totalAmount,
        dueDate: due_date,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await get<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Mock invoice download triggered successfully',
      data: {
        fileName: `${invoice.invoice_number}.pdf`,
        url: `http://localhost:5000/static/invoices/${invoice.invoice_number}.pdf`,
        downloadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const emailInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await get<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    // Transition invoice state to sent
    await run('UPDATE invoices SET status = "sent" WHERE id = ?', [id]);

    const executerId = req.user!.id;
    await logActivity(
      executerId,
      'INVOICE_EMAILED',
      'invoices',
      Number(id),
      `Invoice ${invoice.invoice_number} dispatched to procurement officer team email.`
    );

    res.status(200).json({
      success: true,
      message: `Mock Email sent successfully. Invoice ${invoice.invoice_number} emailed to team.`,
      data: { updatedStatus: 'sent' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInvoices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await all(
      `SELECT inv.*, po.po_number, v.name as vendor_name 
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN quotations q ON po.quotation_id = q.id
       JOIN vendors v ON q.vendor_id = v.id
       ORDER BY inv.id DESC`
    );
    res.status(200).json({ success: true, data: { invoices } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
