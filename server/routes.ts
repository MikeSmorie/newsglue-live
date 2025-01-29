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

// Request payload logging middleware
const logRequestPayload = (req: any, res: any, next: any) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log('[Request Interceptor]', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body,
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

  // Parse URL-encoded bodies (as sent by HTML forms)
  app.use(express.urlencoded({ extended: true }));

  // Add logging middleware
  app.use(logRequestPayload);

  // Set up authentication routes
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/features", requireAdmin, featureRoutes);
  app.use("/api/announcements", requireAuth, announcementsRoutes);
  app.use("/api/admin/announcements", requireAdmin, announcementsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}

// Plugin registry
const plugins: Record<string, { status: string; loadedAt?: Date }> = {};