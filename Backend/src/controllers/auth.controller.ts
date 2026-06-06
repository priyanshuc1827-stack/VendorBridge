import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get } from '../config/db';
import { logActivity } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_secret_key';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'officer' | 'vendor' | 'manager';
  vendor_id: number | null;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, vendor_id } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, error: 'Name, email, password, and role are required' });
      return;
    }

    const validRoles = ['admin', 'officer', 'vendor', 'manager'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: `Invalid role. Allowed: ${validRoles.join(', ')}` });
      return;
    }

    if (role === 'vendor' && !vendor_id) {
      res.status(400).json({ success: false, error: 'vendor_id is required for vendor role' });
      return;
    }

    // Check email UNIQUE
    const existing = await get<UserRow>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      res.status(400).json({ success: false, error: 'Email is already registered' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await run(
      `INSERT INTO users (name, email, password_hash, role, vendor_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, passwordHash, role, vendor_id || null]
    );

    await logActivity(
      result.lastID,
      'USER_REGISTER',
      'users',
      result.lastID,
      `User ${email} registered successfully.`
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { userId: result.lastID },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = await get<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        vendor_id: user.vendor_id,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logActivity(
      user.id,
      'USER_LOGIN',
      'users',
      user.id,
      `User ${user.email} successfully logged in.`
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          vendor_id: user.vendor_id,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
