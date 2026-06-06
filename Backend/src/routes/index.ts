import { Router } from 'express';
import authRoutes from './auth.routes';
import vendorRoutes from './vendor.routes';
import rfqRoutes from './rfq.routes';
import quotationRoutes from './quotation.routes';
import approvalRoutes from './approval.routes';
import purchaseOrderRoutes from './purchaseOrder.routes';
import invoiceRoutes from './invoice.routes';
import { get, all } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/vendors', vendorRoutes);
router.use('/rfqs', rfqRoutes);
router.use('/quotations', quotationRoutes);
router.use('/approvals', approvalRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/invoices', invoiceRoutes);

// Activity logs retrieval
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await all(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.id DESC
    `);
    res.status(200).json({ success: true, data: { logs } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dynamic dashboard metrics stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const rfqsCount = await get<{ count: number }>('SELECT count(*) as count FROM rfqs');
    const openRfqsCount = await get<{ count: number }>("SELECT count(*) as count FROM rfqs WHERE status = 'open'");
    const activeVendorsCount = await get<{ count: number }>("SELECT count(*) as count FROM vendors WHERE status = 'active'");
    const spendSum = await get<{ total: number }>("SELECT sum(total_amount) as total FROM invoices");

    res.status(200).json({
      success: true,
      data: {
        totalRfqs: rfqsCount?.count || 0,
        pendingRfqs: openRfqsCount?.count || 0,
        activeVendors: activeVendorsCount?.count || 0,
        spendMetrics: spendSum?.total || 0,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dynamic reports & analytics charts data
router.get('/reports/analytics', authenticateToken, async (req, res) => {
  try {
    const invoices = await all<any>(`
      SELECT inv.*, v.name as vendor_name 
      FROM invoices inv
      JOIN purchase_orders po ON inv.po_id = po.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN vendors v ON q.vendor_id = v.id
    `);

    const totalSpend = invoices.reduce((sum: number, i: any) => sum + i.total_amount, 0);
    const avgPo = invoices.length > 0 ? totalSpend / invoices.length : 0;
    const totalTax = invoices.reduce((sum: number, i: any) => sum + i.tax_amount, 0);
    const outstanding = invoices
      .filter((i: any) => i.status !== 'paid')
      .reduce((sum: number, i: any) => sum + i.total_amount, 0);

    // Monthly Spend Aggregate
    const monthlySpend: Record<string, number> = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
      'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };
    invoices.forEach((inv: any) => {
      const date = new Date(inv.due_date || new Date());
      const m = date.toLocaleString('default', { month: 'short' });
      if (monthlySpend[m] !== undefined) {
        monthlySpend[m] += inv.total_amount;
      }
    });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = months.map(m => ({
      name: m,
      Spend: monthlySpend[m] || 0,
    }));

    // Vendor share
    const shareMap: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      shareMap[inv.vendor_name] = (shareMap[inv.vendor_name] || 0) + inv.total_amount;
    });
    const vendorShare = Object.keys(shareMap).map((key) => ({
      name: key,
      value: shareMap[key],
    }));

    res.status(200).json({
      success: true,
      data: {
        totalSpend,
        avgPo,
        totalTax,
        outstanding,
        monthlyTrend,
        vendorShare
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
