import { Request, Response, NextFunction } from 'express';

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  // In development, skip verification requirement
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!req.user?.isVerified) {
    return res.status(403).json({ error: 'Email not verified.' });
  }

  next();
}