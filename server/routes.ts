import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  // This configures passport, sessions, and user authentication
  setupAuth(app);

  // Add your application routes here
  // Prefix all routes with /api for consistency

  // Example:
  // app.get("/api/protected", requireAuth, (req, res) => {
  //   res.json({ message: "This is a protected route" });
  // });

  const httpServer = createServer(app);
  return httpServer;
}