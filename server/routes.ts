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

// Raw request logging middleware
const logRawRequest = (req: any, res: any, next: any) => {
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    console.log('\n=== RAW REQUEST INTERCEPTOR ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Raw Body:', rawBody.toString());
    console.log('Content-Type:', req.get('content-type'));
    console.log('==============================\n');

    // Store raw body for routes to access
    req.rawBody = rawBody;
    next();
  });
};

// Simplified auth checks
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).json({ message: "Not authorized" });
};

export function registerRoutes(app: Express) {
  // Basic CORS setup
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Add raw request logging before any parsing
  app.use(logRawRequest);

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