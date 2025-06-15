import { Request, Response } from "express";
import { db } from "@db/index";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { logEvent } from "../../lib/logs";

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Check and update trial status for the current user
 */
export async function checkTrialStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const now = new Date();
    const userId = req.user.id;

    // Get current user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if trial is expired
    const trialExpired = user.trialActive && 
                        user.trialExpiresAt && 
                        new Date(user.trialExpiresAt) <= now;

    if (trialExpired) {
      // Update trial status to inactive
      await db
        .update(users)
        .set({ trialActive: false })
        .where(eq(users.id, userId));

      await logEvent("subscription_change", `Trial expired for user ${user.username}`, {
        userId,
        userRole: user.role,
        endpoint: "/api/trial/check-status",
        severity: "info",
        metadata: {
          previousTrialActive: true,
          newTrialActive: false,
          trialExpiresAt: user.trialExpiresAt
        }
      });

      return res.json({
        trialActive: false,
        trialExpired: true,
        message: "Trial has expired"
      });
    }

    return res.json({
      trialActive: user.trialActive,
      trialExpired: false,
      trialExpiresAt: user.trialExpiresAt,
      daysRemaining: user.trialActive && user.trialExpiresAt ? 
        Math.ceil((new Date(user.trialExpiresAt).getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0
    });

  } catch (error: any) {
    console.error("Trial status check error:", error);
    
    await logEvent("api_error", `Trial status check failed: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: "/api/trial/check-status",
      severity: "error",
      stackTrace: error.stack
    });

    return res.status(500).json({ 
      error: "Failed to check trial status" 
    });
  }
}

/**
 * Admin-only endpoint to reset user trial
 */
export async function resetUserTrial(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Reset trial
    const now = new Date();
    const newTrialExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        trialActive: true,
        trialStartDate: now,
        trialExpiresAt: newTrialExpiry
      })
      .where(eq(users.id, targetUserId));

    await logEvent("user_action", `Trial reset for user ${targetUser.username}`, {
      userId: req.user.id,
      userRole: req.user.role,
      endpoint: `/api/admin/reset-trial/${userId}`,
      severity: "info",
      metadata: {
        targetUserId,
        targetUsername: targetUser.username,
        newTrialExpiry: newTrialExpiry.toISOString(),
        adminUsername: req.user.username
      }
    });

    return res.json({
      success: true,
      message: `Trial reset for user ${targetUser.username}`,
      trialExpiresAt: newTrialExpiry.toISOString(),
      daysRemaining: 14
    });

  } catch (error: any) {
    console.error("Trial reset error:", error);
    
    await logEvent("api_error", `Trial reset failed: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: `/api/admin/reset-trial/${req.params.userId}`,
      severity: "error",
      stackTrace: error.stack
    });

    return res.status(500).json({ 
      error: "Failed to reset trial" 
    });
  }
}