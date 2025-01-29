import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { requestLogger, errorLogger } from "./middleware/logger";
import { db } from "@db";
import { activityLogs, errorLogs, users } from "@db/schema";
import { eq } from "drizzle-orm";
import cors from "cors";
import subscriptionRoutes from "./routes/subscription";
import webhookRoutes from "./routes/webhook";
import aiRoutes from "./routes/ai";
import featureRoutes from "./routes/features";
import announcementsRoutes from "./routes/announcements";
import express from "express";

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

// Content-Type enforcement middleware
const enforceJsonContentType = (req: any, res: any, next: any) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!req.is('application/json')) {
      return res.status(415).json({
        status: 'error',
        message: 'Content-Type must be application/json',
        received: req.headers['content-type']
      });
    }
  }
  next();
};

// Request payload logging middleware
const logRequestPayload = (req: any, res: any, next: any) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log('[Request Interceptor]', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(req.body, null, 2),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Add CORS middleware first
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Parse JSON body before routes
  app.use(express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid JSON in request body',
          details: e instanceof Error ? e.message : 'Unknown parsing error',
          timestamp: new Date().toISOString()
        });
        throw new Error('Invalid JSON');
      }
    }
  }));

  // Add logging middleware
  app.use(logRequestPayload);

  // Enforce JSON content type
  app.use(enforceJsonContentType);

  // Set up authentication routes
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/features", requireAdmin, featureRoutes);
  app.use("/api/announcements", requireAuth, announcementsRoutes);
  app.use("/api/admin/announcements", requireAdmin, announcementsRoutes);

  // Plugin Management Endpoints
  app.post("/api/plugins/load", requireAdmin, (req, res) => {
    const { pluginName } = req.body;

    if (!pluginName) {
      return res.status(400).json({ message: "Plugin name is required" });
    }

    if (plugins[pluginName]) {
      return res.status(400).json({ message: "Plugin already loaded" });
    }

    plugins[pluginName] = {
      status: "active",
      loadedAt: new Date()
    };

    res.json({ message: `Plugin '${pluginName}' loaded successfully` });
  });

  app.get("/api/plugins", requireAdmin, (req, res) => {
    res.json({ plugins });
  });

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
          logging: "configured",
          plugins: {
            status: "operational",
            count: Object.keys(plugins).length
          }
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
          logging: "configured",
          plugins: {
            status: "operational",
            count: Object.keys(plugins).length
          }
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
          },
          plugins: {
            status: "operational",
            loaded: Object.entries(plugins).map(([name, data]) => ({
              name,
              ...data
            }))
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
        userId: req.user!.id,
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

// Plugin registry
const plugins: Record<string, { status: string; loadedAt?: Date }> = {};