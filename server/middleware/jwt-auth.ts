import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Generate JWT token with token version
export function generateToken(user: any): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token and validate token version
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Get current user from database to check token version
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Check if token version matches current user's token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return null; // Token is invalidated due to version mismatch
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

// Middleware to authenticate JWT tokens
export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Attach user info to request
  req.user = payload;
  next();
}

// Middleware for admin-only routes
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supergod')) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Middleware for supergod-only routes
export function requireSupergod(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'supergod') {
    return res.status(403).json({ message: "Supergod access required" });
  }
  next();
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}