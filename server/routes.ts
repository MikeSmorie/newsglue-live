import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { requestLogger, errorLogger } from "./middleware/logger";
import { db } from "@db";
import hpp from "hpp";
import csrf from "csurf";
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

export function registerRoutes(app: Express): Server {
  // Set up CORS first
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin
      if(!origin) return callback(null, true);

      // Allow all Replit domains
      if(origin.match(/\.replit\.(dev|co)$/)) {
        return callback(null, true);
      }

      // Allow local development
      if(origin.match(/localhost|127\.0\.0\.1/)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Security headers
  app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Allow embedding in iframes from Replit domains
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' *.replit.dev *.repl.co; " +
      "frame-ancestors 'self' *.replit.dev *.repl.co; " +
      "img-src 'self' data: blob: *.replit.dev *.repl.co; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.replit.dev *.repl.co; " +
      "style-src 'self' 'unsafe-inline' *.replit.dev *.repl.co;"
    );

    next();
  });

  // Apply other security middleware
  app.use(hpp());

  // Setup auth
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/features", requireAdmin, featureRoutes);
  app.use("/api/announcements", requireAuth, announcementsRoutes);
  app.use("/api/admin/announcements", requireAdmin, announcementsRoutes);

  // Logging middleware
  app.use(requestLogger);
  app.use(errorLogger);

  const httpServer = createServer(app);
  return httpServer;
}