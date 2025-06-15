import { Request, Response } from "express";
import { db } from "../../db";
import { tokens, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { logEvent } from "../../lib/logs";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get user's token balance
export async function getTokenBalance(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userTokens = await db.query.tokens.findFirst({
      where: eq(tokens.userId, userId)
    });

    const balance = userTokens?.balance || 0;
    const expiresAt = userTokens?.expiresAt;
    const lastUsedAt = userTokens?.lastUsedAt;

    await logEvent("user_action", "Token balance checked", {
      userId,
      userRole: req.user?.role,
      endpoint: "/api/tokens/balance"
    });

    res.json({
      balance,
      expiresAt,
      lastUsedAt,
      hasTokens: balance > 0
    });
  } catch (error: any) {
    console.error("Error getting token balance:", error);
    res.status(500).json({ message: "Failed to get token balance" });
  }
}

// Consume tokens (for feature access)
export async function consumeTokens(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { amount, feature } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid token amount" });
    }

    // Get current token balance
    const userTokens = await db.query.tokens.findFirst({
      where: eq(tokens.userId, userId)
    });

    const currentBalance = userTokens?.balance || 0;

    if (currentBalance < amount) {
      return res.status(400).json({ 
        message: "Insufficient tokens",
        required: amount,
        available: currentBalance
      });
    }

    // Check if tokens are expired
    if (userTokens?.expiresAt && new Date() > userTokens.expiresAt) {
      return res.status(400).json({ message: "Tokens have expired" });
    }

    // Update token balance
    if (userTokens) {
      await db.update(tokens)
        .set({ 
          balance: currentBalance - amount,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tokens.userId, userId));
    }

    await logEvent("user_action", `Consumed ${amount} tokens for ${feature}`, {
      userId,
      userRole: req.user?.role,
      endpoint: "/api/tokens/consume",
      metadata: { amount, feature, remainingBalance: currentBalance - amount }
    });

    res.json({
      success: true,
      consumed: amount,
      remainingBalance: currentBalance - amount,
      feature
    });
  } catch (error: any) {
    console.error("Error consuming tokens:", error);
    res.status(500).json({ message: "Failed to consume tokens" });
  }
}

// Admin only - Gift tokens to user
export async function giftTokens(req: AuthenticatedRequest, res: Response) {
  try {
    const { targetUserId, amount, expiresInDays } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Admin not authenticated" });
    }

    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid user ID or token amount" });
    }

    // Check if target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Check if user already has tokens
    const existingTokens = await db.query.tokens.findFirst({
      where: eq(tokens.userId, targetUserId)
    });

    if (existingTokens) {
      // Update existing tokens
      await db.update(tokens)
        .set({
          balance: existingTokens.balance + amount,
          expiresAt: expiresAt || existingTokens.expiresAt,
          updatedAt: new Date()
        })
        .where(eq(tokens.userId, targetUserId));
    } else {
      // Create new token record
      await db.insert(tokens).values({
        userId: targetUserId,
        balance: amount,
        expiresAt
      });
    }

    await logEvent("user_action", `Admin gifted ${amount} tokens to user ${targetUserId}`, {
      userId: adminId,
      userRole: req.user?.role,
      endpoint: "/api/admin/tokens/gift",
      metadata: { targetUserId, amount, expiresInDays }
    });

    res.json({
      success: true,
      message: `Successfully gifted ${amount} tokens to user ${targetUser.username}`,
      targetUser: targetUser.username,
      amount,
      expiresAt
    });
  } catch (error: any) {
    console.error("Error gifting tokens:", error);
    res.status(500).json({ message: "Failed to gift tokens" });
  }
}

// Admin only - Modify user tokens
export async function modifyTokens(req: AuthenticatedRequest, res: Response) {
  try {
    const { targetUserId, newBalance, expiresInDays } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Admin not authenticated" });
    }

    if (!targetUserId || newBalance < 0) {
      return res.status(400).json({ message: "Invalid user ID or token balance" });
    }

    // Check if target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Check if user already has tokens
    const existingTokens = await db.query.tokens.findFirst({
      where: eq(tokens.userId, targetUserId)
    });

    if (existingTokens) {
      // Update existing tokens
      await db.update(tokens)
        .set({
          balance: newBalance,
          expiresAt: expiresAt || existingTokens.expiresAt,
          updatedAt: new Date()
        })
        .where(eq(tokens.userId, targetUserId));
    } else {
      // Create new token record
      await db.insert(tokens).values({
        userId: targetUserId,
        balance: newBalance,
        expiresAt
      });
    }

    await logEvent("user_action", `Admin set user ${targetUserId} tokens to ${newBalance}`, {
      userId: adminId,
      userRole: req.user?.role,
      endpoint: "/api/admin/tokens/modify",
      metadata: { targetUserId, newBalance, expiresInDays }
    });

    res.json({
      success: true,
      message: `Successfully set ${targetUser.username}'s token balance to ${newBalance}`,
      targetUser: targetUser.username,
      newBalance,
      expiresAt
    });
  } catch (error: any) {
    console.error("Error modifying tokens:", error);
    res.status(500).json({ message: "Failed to modify tokens" });
  }
}

// Admin only - Get all user token balances
export async function getAllTokenBalances(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Admin not authenticated" });
    }

    const allTokens = await db.query.tokens.findMany({
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    await logEvent("user_action", "Admin viewed all token balances", {
      userId: adminId,
      userRole: req.user?.role,
      endpoint: "/api/admin/tokens/all"
    });

    res.json({
      tokens: allTokens.map(token => ({
        userId: token.userId,
        username: token.user.username,
        role: token.user.role,
        balance: token.balance,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt
      }))
    });
  } catch (error: any) {
    console.error("Error getting all token balances:", error);
    res.status(500).json({ message: "Failed to get token balances" });
  }
}