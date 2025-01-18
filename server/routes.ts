import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { requestLogger, errorLogger } from "./middleware/logger";
import { db } from "@db";
import { activityLogs, errorLogs, users } from "@db/schema";
import { eq } from "drizzle-orm";
import cors from "cors";

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Not authorized" });
};

export function registerRoutes(app: Express): Server {
  // Add CORS middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Add logging middleware
  app.use(requestLogger);
  app.use(errorLogger);

  // Set up authentication routes
  setupAuth(app);

  // Health Check Endpoints
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      await db.select().from(users).limit(1);

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        components: {
          server: "operational",
          database: "operational",
          auth: "operational",
          cors: "enabled",
          logging: "configured"
        },
        version: process.env.npm_package_version || "1.0.0"
      };

      res.json(healthStatus);
    } catch (error) {
      const unhealthyStatus = {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        components: {
          server: "operational",
          database: "failed",
          auth: "operational",
          cors: "enabled",
          logging: "configured"
        }
      };
      res.status(500).json(unhealthyStatus);
    }
  });

  // Detailed System Status (Admin Only)
  app.get("/api/health/detailed", requireAdmin, async (req, res) => {
    try {
      // Check database tables
      const [userCount] = await db.select({ count: users.id }).from(users);
      const [activityLogCount] = await db.select({ count: activityLogs.id }).from(activityLogs);
      const [errorLogCount] = await db.select({ count: errorLogs.id }).from(errorLogs);

      const detailedStatus = {
        status: "operational",
        timestamp: new Date().toISOString(),
        components: {
          server: {
            status: "operational",
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV,
          },
          database: {
            status: "operational",
            tables: {
              users: userCount,
              activityLogs: activityLogCount,
              errorLogs: errorLogCount,
            },
          },
          auth: {
            status: "operational",
            provider: "passport-local",
          },
          cors: {
            status: "enabled",
            origin: process.env.NODE_ENV === 'production' ? 'restricted' : '*'
          },
          logging: {
            status: "configured",
            providers: ["activity", "error"]
          }
        },
        version: process.env.npm_package_version || "1.0.0"
      };

      res.json(detailedStatus);
    } catch (error) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin routes for viewing logs
  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await db.select().from(activityLogs).orderBy(activityLogs.timestamp);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get("/api/admin/error-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await db.select().from(errorLogs).orderBy(errorLogs.timestamp);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  // Manual logging endpoints
  app.post("/api/log-activity", requireAuth, async (req, res) => {
    try {
      const { action, details } = req.body;
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action,
        details,
        timestamp: new Date()
      });
      res.json({ message: "Activity logged successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to log activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}