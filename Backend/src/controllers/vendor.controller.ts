import { Request, Response } from 'express';
import { run, get, all } from '../config/db';
import { logActivity } from '../utils/logger';

interface Vendor {
  id: number;
  name: string;
  category: string;
  gst_number: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'blocked';
  rating: number;
}

export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, gst_number, email, phone, status, rating } = req.body;

    if (!name || !category || !gst_number || !email || !phone) {
      res.status(400).json({ success: false, error: 'name, category, gst_number, email, phone are required' });
      return;
    }

    const vendorStatus = status || 'active';
    const validStatuses = ['active', 'inactive', 'blocked'];
    if (!validStatuses.includes(vendorStatus)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
      return;
    }

    const result = await run(
      `INSERT INTO vendors (name, category, gst_number, email, phone, status, rating) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, gst_number, email, phone, vendorStatus, rating !== undefined ? rating : 0.0]
    );

    const executerId = req.user ? req.user.id : null;
    await logActivity(executerId, 'VENDOR_CREATED', 'vendors', result.lastID, `Vendor "${name}" created.`);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: { vendorId: result.lastID },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    let sql = 'SELECT * FROM vendors WHERE 1=1';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';
    const vendors = await all<Vendor>(sql, params);
    res.status(200).json({ success: true, data: { vendors } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getVendorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor = await get<Vendor>('SELECT * FROM vendors WHERE id = ?', [id]);

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor not found' });
      return;
    }

    res.status(200).json({ success: true, data: { vendor } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, category, gst_number, email, phone, status, rating } = req.body;

    const vendor = await get<Vendor>('SELECT * FROM vendors WHERE id = ?', [id]);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor not found' });
      return;
    }

    const updatedStatus = status !== undefined ? status : vendor.status;
    const validStatuses = ['active', 'inactive', 'blocked'];
    if (status !== undefined && !validStatuses.includes(updatedStatus)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
      return;
    }

    await run(
      `UPDATE vendors 
       SET name = ?, category = ?, gst_number = ?, email = ?, phone = ?, status = ?, rating = ? 
       WHERE id = ?`,
      [
        name !== undefined ? name : vendor.name,
        category !== undefined ? category : vendor.category,
        gst_number !== undefined ? gst_number : vendor.gst_number,
        email !== undefined ? email : vendor.email,
        phone !== undefined ? phone : vendor.phone,
        updatedStatus,
        rating !== undefined ? rating : vendor.rating,
        id,
      ]
    );

    const executerId = req.user ? req.user.id : null;
    await logActivity(executerId, 'VENDOR_UPDATED', 'vendors', Number(id), `Vendor ID ${id} details updated.`);

    res.status(200).json({ success: true, message: 'Vendor updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor = await get<Vendor>('SELECT name FROM vendors WHERE id = ?', [id]);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor not found' });
      return;
    }

    await run('DELETE FROM vendors WHERE id = ?', [id]);

    const executerId = req.user ? req.user.id : null;
    await logActivity(executerId, 'VENDOR_DELETED', 'vendors', Number(id), `Vendor "${vendor.name}" deleted.`);

    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
