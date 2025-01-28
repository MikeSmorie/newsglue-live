
import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { activityLogs, errorLogs } from "@db/schema";
import { eq } from "drizzle-orm";

// Batch logging queue
const activityQueue: any[] = [];
const errorQueue: any[] = [];
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

async function flushActivityQueue() {
  if (activityQueue.length === 0) return;
  
  const batchToInsert = activityQueue.splice(0, BATCH_SIZE);
  try {
    await db.insert(activityLogs).values(batchToInsert);
  } catch (error) {
    console.error("Failed to flush activity logs:", error);
  }
}

async function flushErrorQueue() {
  if (errorQueue.length === 0) return;
  
  const batchToInsert = errorQueue.splice(0, BATCH_SIZE);
  try {
    await db.insert(errorLogs).values(batchToInsert);
  } catch (error) {
    console.error("Failed to flush error logs:", error);
  }
}

// Set up periodic flushing
setInterval(flushActivityQueue, FLUSH_INTERVAL);
setInterval(flushErrorQueue, FLUSH_INTERVAL);

export async function logActivity(userId: number, action: string, details?: string) {
  activityQueue.push({
    userId,
    action,
    details,
    timestamp: new Date()
  });

  if (activityQueue.length >= BATCH_SIZE) {
    await flushActivityQueue();
  }
}

export async function logSecurityEvent(event: string, details: string, severity: 'low' | 'medium' | 'high' = 'low') {
  errorQueue.push({
    errorMessage: event,
    location: 'Security',
    stackTrace: details,
    timestamp: new Date()
  });

  if (errorQueue.length >= BATCH_SIZE) {
    await flushErrorQueue();
  }
}

export async function logError(error: Error, location: string) {
  errorQueue.push({
    errorMessage: error.message,
    location,
    stackTrace: error.stack,
    timestamp: new Date()
  });

  if (errorQueue.length >= BATCH_SIZE) {
    await flushErrorQueue();
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
        `Status: ${res.statusCode}`);
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
