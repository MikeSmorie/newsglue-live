import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { activityLogs, errorLogs } from "@db/schema";
import { eq } from "drizzle-orm";
import { logEvent, logAPIError } from "../../lib/logs";

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

export async function logError(error: Error, location: string) {
  try {
    await db.insert(errorLogs).values({
      level: "ERROR",
      message: error.message,
      source: location,
      stackTrace: error.stack,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to log error:", err);
  }
}

/**
 * Enhanced request logger with Omega-V8.3 observability
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const endpoint = `${req.method} ${req.path}`;
    const user = (req as any).user;
    
    // Log to console for development
    const logMessage = `${endpoint} ${res.statusCode} in ${duration}ms`;
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`${logMessage} :: ${JSON.stringify(req.body).substring(0, 200)}`);
    } else {
      console.log(logMessage);
    }
    
    // Log failed requests to Omega logs
    if (res.statusCode >= 400) {
      await logEvent("failed_request", `${endpoint} failed with status ${res.statusCode}`, {
        userId: user?.id,
        userRole: user?.role,
        endpoint,
        severity: res.statusCode >= 500 ? "error" : "warning",
        metadata: {
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });
    }
  });
  
  next();
}

/**
 * Enhanced error logger with stack trace capture
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  const endpoint = `${req.method} ${req.path}`;
  const user = (req as any).user;
  
  console.error(`Error on ${endpoint}:`, err);
  
  // Log to both old and new systems
  logError(err, endpoint);
  logAPIError(endpoint, err, user?.id, user?.role);
  
  next(err);
}
