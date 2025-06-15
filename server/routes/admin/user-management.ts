import { Router } from "express";
import { db } from "../../../db";
import { users, activityLogs } from "../../../db/schema";
import { eq, count, desc } from "drizzle-orm";
// Simplified logging without logEvent for now
const logAdminAction = (action: string, details: any) => {
  console.log(`[ADMIN ACTION] ${action}:`, details);
};

export const userManagementRouter = Router();

// Middleware to ensure admin/supergod access
const requireAdminOrSupergod = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'supergod') {
    return res.status(403).json({ success: false, message: "Admin or Supergod access required" });
  }
  
  next();
};

// Get all users with stats
userManagementRouter.get("/users", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        // Get AI request count from activity logs
        const aiRequestCount = await db
          .select({ count: count() })
          .from(activityLogs)
          .where(eq(activityLogs.userId, user.id));

        // Get referral count (if referrals exist)
        let referralCount = 0;
        try {
          const referralResult = await db.query.referralRedemptions.findMany({
            where: eq(activityLogs.userId, user.id)
          });
          referralCount = referralResult.length;
        } catch (error) {
          // Referral table might not exist yet
          referralCount = 0;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          tokens: user.tokens,
          subscriptionPlan: user.subscriptionPlan,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          notes: user.notes,
          isTestAccount: user.isTestAccount,
          aiRequestCount: aiRequestCount[0]?.count || 0,
          referralCount
        };
      })
    );

    logAdminAction("User list accessed", {
      adminId: req.user.id,
      adminRole: req.user.role,
      userCount: usersWithStats.length
    });

    res.json({
      success: true,
      data: usersWithStats
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});

// Suspend user
userManagementRouter.post("/user/:id/suspend", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent suspending other admins/supergods unless you're supergod
    if ((user.role === 'admin' || user.role === 'supergod') && req.user.role !== 'supergod') {
      return res.status(403).json({
        success: false,
        message: "Cannot suspend admin users without supergod privileges"
      });
    }

    await db.update(users)
      .set({ status: 'suspended' })
      .where(eq(users.id, userId));

    logAdminAction("User suspended", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username
    });

    res.json({
      success: true,
      message: `User ${user.username} has been suspended`
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend user"
    });
  }
});

// Ban user
userManagementRouter.post("/user/:id/ban", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent banning other admins/supergods unless you're supergod
    if ((user.role === 'admin' || user.role === 'supergod') && req.user.role !== 'supergod') {
      return res.status(403).json({
        success: false,
        message: "Cannot ban admin users without supergod privileges"
      });
    }

    await db.update(users)
      .set({ status: 'banned' })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "User banned", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username
    });

    res.json({
      success: true,
      message: `User ${user.username} has been banned`
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ban user"
    });
  }
});

// Activate user
userManagementRouter.post("/user/:id/activate", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await db.update(users)
      .set({ status: 'active' })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "User activated", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username
    });

    res.json({
      success: true,
      message: `User ${user.username} has been activated`
    });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate user"
    });
  }
});

// Delete user
userManagementRouter.delete("/user/:id", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent deleting other admins/supergods unless you're supergod
    if ((user.role === 'admin' || user.role === 'supergod') && req.user.role !== 'supergod') {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users without supergod privileges"
      });
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }

    logAdminAction("admin_action", "User deleted", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username
    });

    await db.delete(users).where(eq(users.id, userId));

    res.json({
      success: true,
      message: `User ${user.username} has been deleted`
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user"
    });
  }
});

// Add credits to user
userManagementRouter.post("/user/:id/credits", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid credit amount"
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const newTokenBalance = (user.tokens || 0) + amount;

    await db.update(users)
      .set({ tokens: newTokenBalance })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "Credits added to user", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username,
      creditsAdded: amount,
      newBalance: newTokenBalance
    });

    res.json({
      success: true,
      message: `Added ${amount} credits to ${user.username}. New balance: ${newTokenBalance}`
    });
  } catch (error) {
    console.error("Error adding credits:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add credits"
    });
  }
});

// Update user role
userManagementRouter.post("/user/:id/role", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['user', 'admin', 'supergod'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role"
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Only supergods can assign supergod role
    if (role === 'supergod' && req.user.role !== 'supergod') {
      return res.status(403).json({
        success: false,
        message: "Only supergods can assign supergod role"
      });
    }

    // Prevent changing other admin/supergod roles unless you're supergod
    if ((user.role === 'admin' || user.role === 'supergod') && req.user.role !== 'supergod') {
      return res.status(403).json({
        success: false,
        message: "Cannot modify admin roles without supergod privileges"
      });
    }

    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "User role updated", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username,
      oldRole: user.role,
      newRole: role
    });

    res.json({
      success: true,
      message: `Updated ${user.username}'s role to ${role}`
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update role"
    });
  }
});

// Update user subscription
userManagementRouter.post("/user/:id/subscription", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { plan } = req.body;

    if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan"
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await db.update(users)
      .set({ subscriptionPlan: plan })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "User subscription updated", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username,
      oldPlan: user.subscriptionPlan,
      newPlan: plan
    });

    res.json({
      success: true,
      message: `Updated ${user.username}'s subscription to ${plan}`
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription"
    });
  }
});

// Update user notes
userManagementRouter.post("/user/:id/notes", requireAdminOrSupergod, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { notes } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await db.update(users)
      .set({ notes: notes || null })
      .where(eq(users.id, userId));

    logAdminAction("admin_action", "User notes updated", {
      adminId: req.user.id,
      adminRole: req.user.role,
      targetUserId: userId,
      targetUsername: user.username
    });

    res.json({
      success: true,
      message: `Updated notes for ${user.username}`
    });
  } catch (error) {
    console.error("Error updating notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notes"
    });
  }
});

export default userManagementRouter;