import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_secret_key';

export interface UserPayload {
  id: number;
  email: string;
  role: 'admin' | 'officer' | 'vendor' | 'manager';
  vendor_id: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token is required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ success: false, error: 'Invalid or expired access token' });
      return;
    }

    req.user = decoded as UserPayload;
    next();
  });
};

export const requireRole = (
  allowedRoles: ('admin' | 'officer' | 'vendor' | 'manager')[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Session missing' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};
