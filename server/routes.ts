import type { Express } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import cors from "cors";
import express from "express";
import subscriptionRoutes from "./routes/subscription";
import webhookRoutes from "./routes/webhook";
import aiRoutes from "./routes/ai";
import featureRoutes from "./routes/features";
import messagesRoutes from "./routes/announcements";
import adminLogsRoutes from "./routes/admin-logs";
import paymentRoutes from "./routes/payment";
import logsRoutes from "./routes/logs";
import { registerSupergodRoutes } from "./routes/supergod";
import auditRoutes from "./routes/admin/audit";
import { modulesRouter } from "./routes/modules";
import { checkTrialStatus, resetUserTrial } from "./routes/trial";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { logError } from "./utils/logger";
import { requireRole, requireSupergod } from "./middleware/rbac";
import { getTokenBalance, consumeTokens, giftTokens, modifyTokens, getAllTokenBalances } from "./routes/tokens";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { logEvent } from "../lib/logs";

// Simple auth checks using passport
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && (req.user.role === "admin" || req.user.role === "supergod")) return next();
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
  setupAuth(app);

  // Register routes
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/webhook", webhookRoutes);
  app.use("/api/ai", aiRoutes);

  // Split features routes into public and admin
  app.use("/api/features/check", requireAuth, featureRoutes); // Public feature check route
  app.use("/api/features/admin", requireAdmin, featureRoutes); // Admin-only routes

  app.use("/api/messages", messagesRoutes);
  app.use("/api/admin", requireAdmin, adminLogsRoutes);
  app.use("/api/admin/logs", logsRoutes);
  app.use("/api/admin/audit-logs", auditRoutes);
  app.use("/api/payment", paymentRoutes);

  // User profile export route
  app.get("/api/user/export", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userRecord = {
        id: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscriptionPlan: 'free',
        twoFactorEnabled: false
      };

      const { generateUserPdf } = await import("./utils/pdf");
      const pdfBuffer = await generateUserPdf(userRecord);
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=omega-user-profile.txt");
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating user profile export:", error);
      res.status(500).json({ message: "Failed to generate user profile export" });
    }
  });

  // Subscription management routes
  app.post("/api/subscription/change", requireAuth, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Mock subscription change - log a fake payment record
      const mockPayment = {
        userId,
        method: "paypal", // Default to PayPal for upgrades
        status: "pending",
        reference: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // In a real implementation, you would:
      // 1. Update user's subscription plan in database
      // 2. Create actual payment record
      // 3. Handle payment processing

      console.log(`[MOCK] Subscription change request: User ${userId} -> Plan ${planId}`);
      console.log(`[MOCK] Payment record:`, mockPayment);

      res.json({
        success: true,
        message: "Subscription change request submitted",
        paymentReference: mockPayment.reference
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's payment history
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Mock payment history - in real implementation, query database
      const mockPayments = [
        {
          id: 1,
          method: "paypal",
          status: "completed",
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          reference: `PAY-${Date.now() - 30 * 24 * 60 * 60 * 1000}-ABCD1234`
        },
        {
          id: 2,
          method: "stablecoin",
          status: "pending",
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reference: `USDC-${Date.now() - 7 * 24 * 60 * 60 * 1000}-XYZ9876`
        }
      ];

      res.json(mockPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save wallet address
  app.post("/api/user/wallet", requireAuth, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Valid wallet address required" });
      }

      // Mock wallet address save - in real implementation, update database
      console.log(`[MOCK] Saving wallet address for user ${userId}: ${walletAddress}`);

      res.json({
        success: true,
        message: "Wallet address saved successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PayPal routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Trial management routes
  app.post("/api/trial/check-status", requireAuth, checkTrialStatus);
  app.post("/api/admin/reset-trial/:userId", requireAdmin, resetUserTrial);

  // Admin route to get all user subscriptions
  app.get("/api/admin/subscriptions", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.query.users.findMany({
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          }
        }
      });

      const subscriptionsData = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        walletAddress: user.walletAddress,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        lastPaymentStatus: user.subscriptions?.[0] ? "active" : null,
        lastPaymentDate: user.subscriptions?.[0]?.startDate || null
      }));

      res.json(subscriptionsData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get users with subscription info for subscription manager
  app.get("/api/users/with-subscriptions", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.query.users.findMany({
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          }
        }
      });

      const usersData = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        subscription: user.subscriptions?.[0] ? {
          id: user.subscriptions[0].id,
          planId: user.subscriptions[0].planId,
          status: user.subscriptions[0].status
        } : undefined
      }));

      res.json(usersData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // 2FA management routes
  app.get("/api/2fa/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Query database for user's 2FA settings
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          twoFactorEnabled: true,
          twoFactorSecret: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const response = {
        enabled: user.twoFactorEnabled || false,
        secret: user.twoFactorSecret || undefined
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/2fa/enable", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Generate TOTP secret for this user
      const totpSecret = "JBSWY3DPEHPK3PXP" + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Update database to enable 2FA and store secret
      await db.update(users)
        .set({ 
          twoFactorEnabled: true,
          twoFactorSecret: totpSecret 
        })
        .where(eq(users.id, userId));

      console.log(`[2FA] Enabled for user ${userId}`);

      res.json({
        success: true,
        message: "2FA enabled successfully",
        secret: totpSecret
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/2fa/disable", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Update database to disable 2FA and clear secret
      await db.update(users)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null 
        })
        .where(eq(users.id, userId));

      console.log(`[2FA] Disabled for user ${userId}`);

      res.json({
        success: true,
        message: "2FA disabled successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client error logging endpoint
  app.post("/api/logs/client-error", async (req, res) => {
    try {
      const { message, stack, componentStack, timestamp, userAgent, url } = req.body;
      const user = (req as any).user;

      await logEvent("error_boundary", `Client error: ${message}`, {
        userId: user?.id,
        userRole: user?.role || "anonymous",
        endpoint: url,
        severity: "error",
        stackTrace: stack,
        metadata: {
          componentStack,
          timestamp,
          userAgent,
          url
        }
      });

      res.json({ success: true, message: "Error logged successfully" });
    } catch (error: any) {
      console.error("Failed to log client error:", error);
      res.status(500).json({ message: "Failed to log error" });
    }
  });

  // Module access control routes
  app.use("/api/modules", modulesRouter);

  // Register supergod-only routes
  registerSupergodRoutes(app); // These routes have their own middleware checks

  // Error handler must be last
  app.use(errorHandler);

  return createServer(app);
}