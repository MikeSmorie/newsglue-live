import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { activityLogs, errorLogs } from "@db/schema";
import { eq } from "drizzle-orm";

export async function logActivity(userId: number, action: string, details?: string) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function logSecurityEvent(event: string, details: string, severity: 'low' | 'medium' | 'high' = 'low') {
  try {
    await db.insert(errorLogs).values({
      errorMessage: event,
      location: 'Security',
      stackTrace: details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to log security event:", err);
  }
}

export async function logError(error: Error, location: string) {
  try {
    await db.insert(errorLogs).values({
      errorMessage: error.message,
      location,
      stackTrace: error.stack,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to log error:", err);
  }
}

// Middleware to log all API requests
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const originalEnd = res.end;
  const originalJson = res.json;

  res.json = function (body: any) {
    if (req.user) {
      logActivity(req.user.id, `${req.method} ${req.path}`, 
        `Status: ${res.statusCode}, Response: ${JSON.stringify(body).slice(0, 100)}`);
    }
    return originalJson.call(this, body);
  };

  res.end = function (...args) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    return originalEnd.apply(this, args);
  };

  next();
}

// Error logging middleware
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logError(err, `${req.method} ${req.path}`);
  next(err);
}
