
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import csrf from "csurf";
import hpp from "hpp";
import { logActivity } from "./logger";
import type { Request, Response, NextFunction } from "express";

// Rate limiting configuration
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  handler: async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await logActivity(0, 'RATE_LIMIT_EXCEEDED', 
      `Too many login attempts from IP: ${ip}`);
    res.status(429).json({
      message: "Too many login attempts. Please try again later."
    });
  }
});

// CSRF Protection
export const csrfProtection = csrf({ cookie: true });

// Input Validation
export const validateLoginInput = [
  body('username').trim().notEmpty().escape(),
  body('password').trim().notEmpty(),
];

export const validateRegisterInput = [
  body('username').trim().notEmpty().escape(),
  body('password').trim().isLength({ min: 8 }),
];

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Failed login tracking
const loginAttempts = new Map<string, number>();

export const trackFailedLogin = async (ip: string) => {
  const attempts = (loginAttempts.get(ip) || 0) + 1;
  loginAttempts.set(ip, attempts);

  if (attempts >= 3) {
    await logActivity(0, 'SECURITY_ALERT',
      `Multiple failed login attempts detected from IP: ${ip}`);
  }

  // Reset after 1 hour
  setTimeout(() => loginAttempts.delete(ip), 60 * 60 * 1000);
};
