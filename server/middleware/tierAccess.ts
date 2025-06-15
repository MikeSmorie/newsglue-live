import { Request, Response, NextFunction } from "express";
import { db } from "@db/index";
import { modules, users } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import { logEvent } from "../../lib/logs";

// Tier hierarchy for access control
const TIER_HIERARCHY = {
  free: 0,
  pro: 1,
  enterprise: 2
};

export interface TierRequest extends Request {
  user?: any; // Use any to avoid type conflicts with auth middleware
}

/**
 * Middleware to check if user has sufficient tier for module access
 */
export function requireTier(moduleName: string) {
  return async (req: TierRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: "Authentication required",
          redirectTo: "/login"
        });
      }

      // Get module requirements
      const module = await db.query.modules.findFirst({
        where: eq(modules.name, moduleName)
      });

      if (!module) {
        // Log module not found
        await logEvent("api_error", `Module not found: ${moduleName}`, {
          userId: req.user.id,
          userRole: req.user.role,
          endpoint: req.path,
          severity: "warning"
        });
        
        return res.status(404).json({ 
          error: "Module not found",
          module: moduleName
        });
      }

      // Check if module is active
      if (!module.isActive) {
        await logEvent("user_action", `Access denied to inactive module: ${moduleName}`, {
          userId: req.user.id,
          userRole: req.user.role,
          endpoint: req.path,
          severity: "warning"
        });
        
        return res.status(403).json({ 
          error: "Module is currently unavailable",
          module: moduleName
        });
      }

      // Get user's current tier level with trial override
      let effectiveTier = req.user.subscriptionPlan as keyof typeof TIER_HIERARCHY;
      
      // Check if user has active trial
      const now = new Date();
      const trialActive = req.user.trialActive && 
                         req.user.trialExpiresAt && 
                         new Date(req.user.trialExpiresAt) > now;
      
      // Override tier to enterprise if trial is active
      if (trialActive) {
        effectiveTier = 'enterprise';
      }
      
      const requiredTier = module.requiredTier as keyof typeof TIER_HIERARCHY;

      // Check tier access
      if (TIER_HIERARCHY[effectiveTier] < TIER_HIERARCHY[requiredTier]) {
        // Log access denied
        await logEvent("user_action", `Tier access denied for module: ${moduleName}`, {
          userId: req.user.id,
          userRole: req.user.role,
          endpoint: req.path,
          severity: "info",
          metadata: {
            userTier: req.user.subscriptionPlan,
            effectiveTier,
            requiredTier,
            moduleName,
            trialActive
          }
        });

        return res.status(403).json({ 
          error: "Insufficient subscription tier",
          module: moduleName,
          userTier: req.user.subscriptionPlan,
          effectiveTier,
          requiredTier,
          trialActive,
          redirectTo: `/locked-module?name=${encodeURIComponent(moduleName)}`
        });
      }

      // Log successful access
      await logEvent("user_action", `Module access granted: ${moduleName}`, {
        userId: req.user.id,
        userRole: req.user.role,
        endpoint: req.path,
        severity: "info",
        metadata: {
          userTier: req.user.subscriptionPlan,
          effectiveTier,
          requiredTier,
          moduleName,
          trialActive
        }
      });

      next();
    } catch (error: any) {
      console.error("Tier access check error:", error);
      
      await logEvent("api_error", `Tier access middleware error: ${error.message}`, {
        userId: req.user?.id,
        userRole: req.user?.role,
        endpoint: req.path,
        severity: "error",
        stackTrace: error.stack
      });

      res.status(500).json({ 
        error: "Access control error",
        message: "Unable to verify tier access"
      });
    }
  };
}

/**
 * Get user's accessible modules based on tier
 */
export async function getUserAccessibleModules(userTier: string) {
  try {
    const userTierLevel = TIER_HIERARCHY[userTier as keyof typeof TIER_HIERARCHY] ?? 0;
    
    const allModules = await db.query.modules.findMany({
      where: eq(modules.isActive, true)
    });

    // Filter accessible modules based on tier
    const accessibleModules = allModules.filter(module => {
      const requiredTierLevel = TIER_HIERARCHY[module.requiredTier as keyof typeof TIER_HIERARCHY] ?? 0;
      return userTierLevel >= requiredTierLevel;
    });

    return accessibleModules;
  } catch (error) {
    console.error("Error getting accessible modules:", error);
    return [];
  }
}

/**
 * Check if user can access specific module
 */
export async function canUserAccessModule(userTier: string, moduleName: string): Promise<boolean> {
  try {
    const module = await db.query.modules.findFirst({
      where: eq(modules.name, moduleName)
    });

    if (!module || !module.isActive) {
      return false;
    }

    const userTierLevel = TIER_HIERARCHY[userTier as keyof typeof TIER_HIERARCHY] ?? 0;
    const requiredTierLevel = TIER_HIERARCHY[module.requiredTier as keyof typeof TIER_HIERARCHY] ?? 0;

    return userTierLevel >= requiredTierLevel;
  } catch (error) {
    console.error("Error checking module access:", error);
    return false;
  }
}