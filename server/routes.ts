import type { Express } from "express";
import { createServer } from "http";
import { setupSimpleAuth } from "./simple-auth";
import cors from "cors";
import express from "express";
import subscriptionRoutes from "./routes/subscription";
import webhookRoutes from "./routes/webhook";
import aiRoutes from "./routes/ai";
import featureRoutes from "./routes/features";
import messagesRoutes from "./routes/announcements";
import adminLogsRoutes from "./routes/admin-logs";
import paymentRoutes from "./routes/payment";
import { registerSupergodRoutes } from "./routes/supergod";
import { logError } from "./utils/logger";
import { requireRole, requireSupergod } from "./middleware/rbac";

// Simple auth checks using session
const requireAuth = (req: any, res: any, next: any) => {
  const sessionUser = (req.session as any).user;
  if (sessionUser) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireAdmin = (req: any, res: any, next: any) => {
  const sessionUser = (req.session as any).user;
  if (sessionUser && (sessionUser.role === "admin" || sessionUser.role === "supergod")) return next();
  res.status(403).json({ message: "Not authorized" });
};

// Global error handler
const errorHandler = async (err: any, req: any, res: any, next: any) => {
  await logError(
    "ERROR",
    err.message,
    `${req.method} ${req.path}`,
    err.stack
  );

  res.status(500).json({
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "production" ? undefined : err.message
  });
};

export function registerRoutes(app: Express) {
  // Basic CORS setup
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Form data parser
  app.use(express.urlencoded({ 
    extended: true,
    limit: '50mb'
  }));

  // Setup auth
  setupSimpleAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);

  // Split features routes into public and admin
  app.use("/api/features/check", requireAuth, featureRoutes); // Public feature check route
  app.use("/api/features/admin", requireAdmin, featureRoutes); // Admin-only routes

  app.use("/api/messages", messagesRoutes);
  app.use("/api/admin", requireAdmin, adminLogsRoutes);
  app.use("/api/payment", paymentRoutes);
  
  // Register supergod-only routes
  registerSupergodRoutes(app); // These routes have their own middleware checks

  // Error handler must be last
  app.use(errorHandler);

  return createServer(app);
}