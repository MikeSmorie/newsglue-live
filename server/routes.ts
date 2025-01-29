import type { Express } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import cors from "cors";
import express from "express";
import announcementsRoutes from "./routes/announcements";
import subscriptionRoutes from "./routes/subscription";
import webhookRoutes from "./routes/webhook";
import aiRoutes from "./routes/ai";
import featureRoutes from "./routes/features";

// Simplified auth checks
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).json({ message: "Not authorized" });
};

export function registerRoutes(app: Express): Server {
  // Basic CORS setup
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Raw body parser for debugging
  app.use(express.raw({
    type: '*/*',
    limit: '50mb'
  }));

  // Basic form parser
  app.use(express.urlencoded({ 
    extended: true,
    limit: '50mb'
  }));

  // Setup auth
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/features", requireAdmin, featureRoutes);
  app.use("/api/announcements", requireAuth, announcementsRoutes);
  app.use("/api/admin/announcements", requireAdmin, announcementsRoutes);

  return createServer(app);
}