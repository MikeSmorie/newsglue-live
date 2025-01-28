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

// Plugin registry
const plugins: Record<string, { status: string; loadedAt?: Date }> = {};

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

// Update the JSON validation middleware
const validateJSON = (req: any, res: any, next: any) => {
  if (req.is('application/json')) {
    try {
      // Log incoming request for debugging
      console.log('Incoming announcement payload:', JSON.stringify(req.body, null, 2));

      // Validate JSON structure
      const payload = JSON.parse(JSON.stringify(req.body));

      // Additional validation for announcement-specific payloads
      if (req.path.includes('/announcements') && req.method === 'POST') {
        const { title, content, importance, targetAudience } = payload;

        // Log validation attempt
        console.log('Validating announcement payload:', { title, content, importance, targetAudience });

        // Basic structure validation
        if (!title || typeof title !== 'string' || !content || typeof content !== 'string') {
          throw new Error('Invalid title or content format');
        }

        if (!importance || !['normal', 'important', 'urgent'].includes(importance)) {
          throw new Error('Invalid importance level');
        }

        if (!targetAudience || typeof targetAudience !== 'object') {
          throw new Error('Invalid target audience format');
        }
      }

      next();
    } catch (error) {
      // Log the validation error for debugging
      console.error('JSON Validation Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        body: req.body
      });

      // Return a structured error response
      res.status(400).json({ 
        status: 'error',
        message: "Invalid JSON format or missing required fields", 
        details: error instanceof Error ? error.message : "Unknown validation error",
        timestamp: new Date().toISOString()
      });
    }
  } else {
    next();
  }
};

// Update announcement dates validation
const validateAnnouncementDates = (req: any, res: any, next: any) => {
  if (req.path.includes('/announcements') && req.method === 'POST') {
    const { startDate, endDate } = req.body;

    try {
      console.log('Validating announcement dates:', { startDate, endDate });

      // Validate start date
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new Error('Invalid start date format');
      }

      // Validate that start date is not in the past
      if (parsedStartDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        throw new Error('Start date cannot be in the past');
      }

      // Validate end date if provided
      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          throw new Error('Invalid end date format');
        }
        if (parsedEndDate <= parsedStartDate) {
          throw new Error('End date must be after start date');
        }
      }

      // Add parsed dates to request for later use
      req.parsedDates = {
        startDate: parsedStartDate,
        endDate: endDate ? new Date(endDate) : undefined
      };

      next();
    } catch (error) {
      // Log the validation error
      console.error('Date Validation Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        startDate,
        endDate,
        path: req.path
      });

      res.status(400).json({ 
        status: 'error',
        message: "Date validation failed", 
        details: error instanceof Error ? error.message : "Invalid date format",
        timestamp: new Date().toISOString()
      });
    }
  } else {
    next();
  }
};

// Update announcement payload validation
const validateAnnouncementPayload = (req: any, res: any, next: any) => {
  if (req.path.includes('/announcements') && req.method === 'POST') {
    const { title, content, importance, targetAudience, startDate } = req.body;

    try {
      console.log('Validating announcement payload structure:', {
        hasTitle: !!title,
        hasContent: !!content,
        importance,
        targetAudienceType: targetAudience?.type
      });

      // Validate required fields with detailed error messages
      const validationErrors = [];

      if (!title?.trim()) {
        validationErrors.push('Title is required and cannot be empty');
      }
      if (!content?.trim()) {
        validationErrors.push('Content is required and cannot be empty');
      }
      if (!importance || !['normal', 'important', 'urgent'].includes(importance)) {
        validationErrors.push('Valid importance level (normal, important, urgent) is required');
      }
      if (!targetAudience?.type || !['all', 'subscription', 'user'].includes(targetAudience.type)) {
        validationErrors.push('Valid target audience type (all, subscription, user) is required');
      }
      if (!startDate) {
        validationErrors.push('Start date is required');
      }

      // Validate target IDs if needed
      if (targetAudience?.type !== 'all' && (!Array.isArray(targetAudience.targetIds) || targetAudience.targetIds.length === 0)) {
        validationErrors.push('At least one target recipient is required for non-global announcements');
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('; '));
      }

      next();
    } catch (error) {
      // Log the validation error with detailed context
      console.error('Announcement Payload Validation Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: req.body,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(400).json({
        status: 'error',
        message: "Invalid announcement data",
        details: error instanceof Error ? error.message : "Unknown validation error",
        timestamp: new Date().toISOString()
      });
    }
  } else {
    next();
  }
};

export function registerRoutes(app: Express): Server {
  // Add CORS middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Add validation middleware
  app.use(validateJSON);
  app.use(validateAnnouncementDates);
  app.use(validateAnnouncementPayload);

  // Set up authentication routes
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/features", requireAdmin, featureRoutes);

  // Add announcement routes with appropriate middleware
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