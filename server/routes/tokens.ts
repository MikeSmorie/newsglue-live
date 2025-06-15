import { Request, Response } from "express";
import { db } from "../../db";
import { tokens, users } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logEvent } from "../../lib/logs";

export async function getTokenBalance(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Get user's token record
    const [userTokens] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .limit(1);

    if (!userTokens) {
      // Return default empty balance
      return res.json({
        balance: 0,
        expiresAt: null,
        lastUsedAt: null,
        hasTokens: false
      });
    }

    const hasTokens = userTokens.balance > 0;
    const isExpired = userTokens.expiresAt && new Date(userTokens.expiresAt) < new Date();

    res.json({
      balance: isExpired ? 0 : userTokens.balance,
      expiresAt: userTokens.expiresAt,
      lastUsedAt: userTokens.lastUsedAt,
      hasTokens: hasTokens && !isExpired
    });
  } catch (error: any) {
    console.error("Error fetching token balance:", error);
    res.status(500).json({ message: "Failed to fetch token balance" });
  }
}

export async function consumeTokens(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    const { amount } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid token amount" });
    }

    // Get current token balance
    const [userTokens] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .limit(1);

    if (!userTokens) {
      return res.status(400).json({ message: "No tokens available" });
    }

    // Check if tokens are expired
    const isExpired = userTokens.expiresAt && new Date(userTokens.expiresAt) < new Date();
    if (isExpired) {
      return res.status(400).json({ message: "Tokens have expired" });
    }

    if (userTokens.balance < amount) {
      return res.status(400).json({ message: "Insufficient token balance" });
    }

    // Update token balance
    const [updatedTokens] = await db
      .update(tokens)
      .set({
        balance: userTokens.balance - amount,
        lastUsedAt: new Date()
      })
      .where(eq(tokens.userId, userId))
      .returning();

    await logEvent("token_consumption", `User consumed ${amount} tokens`, {
      userId,
      metadata: { amount, remainingBalance: updatedTokens.balance }
    });

    res.json({
      success: true,
      remainingBalance: updatedTokens.balance,
      consumed: amount
    });
  } catch (error: any) {
    console.error("Error consuming tokens:", error);
    res.status(500).json({ message: "Failed to consume tokens" });
  }
}

export async function giftTokens(req: Request, res: Response) {
  try {
    const { userId, amount, expiresAt } = req.body;
    const adminId = (req.user as any)?.id;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid user ID or token amount" });
    }

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already has tokens
    const [existingTokens] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .limit(1);

    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    if (existingTokens) {
      // Update existing token record
      const [updatedTokens] = await db
        .update(tokens)
        .set({
          balance: existingTokens.balance + amount,
          expiresAt: expirationDate,
          updatedAt: new Date()
        })
        .where(eq(tokens.userId, userId))
        .returning();

      await logEvent("token_gift", `Admin gifted ${amount} tokens to user ${userId}`, {
        userId: adminId,
        metadata: { targetUserId: userId, amount, newBalance: updatedTokens.balance }
      });
    } else {
      // Create new token record
      const [newTokens] = await db
        .insert(tokens)
        .values({
          userId,
          balance: amount,
          expiresAt: expirationDate,
          lastUsedAt: null
        })
        .returning();

      await logEvent("token_gift", `Admin gifted ${amount} tokens to user ${userId}`, {
        userId: adminId,
        metadata: { targetUserId: userId, amount, newBalance: newTokens.balance }
      });
    }

    res.json({
      success: true,
      message: `Successfully gifted ${amount} tokens to user ${targetUser.username}`
    });
  } catch (error: any) {
    console.error("Error gifting tokens:", error);
    res.status(500).json({ message: "Failed to gift tokens" });
  }
}

export async function modifyTokens(req: Request, res: Response) {
  try {
    const { userId, balance, expiresAt } = req.body;
    const adminId = (req.user as any)?.id;

    if (!userId || balance < 0) {
      return res.status(400).json({ message: "Invalid user ID or balance" });
    }

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    // Check if user has existing tokens
    const [existingTokens] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .limit(1);

    if (existingTokens) {
      // Update existing token record
      await db
        .update(tokens)
        .set({
          balance,
          expiresAt: expirationDate,
          updatedAt: new Date()
        })
        .where(eq(tokens.userId, userId));
    } else {
      // Create new token record
      await db
        .insert(tokens)
        .values({
          userId,
          balance,
          expiresAt: expirationDate,
          lastUsedAt: null
        });
    }

    await logEvent("token_modification", `Admin modified tokens for user ${userId}`, {
      userId: adminId,
      metadata: { targetUserId: userId, newBalance: balance }
    });

    res.json({
      success: true,
      message: `Successfully updated token balance for user ${targetUser.username}`
    });
  } catch (error: any) {
    console.error("Error modifying tokens:", error);
    res.status(500).json({ message: "Failed to modify tokens" });
  }
}

export async function getAllTokenBalances(req: Request, res: Response) {
  try {
    // Get all users with their token balances
    const usersWithTokens = await db
      .select({
        userId: users.id,
        username: users.username,
        role: users.role,
        balance: tokens.balance,
        expiresAt: tokens.expiresAt,
        lastUsedAt: tokens.lastUsedAt,
        createdAt: tokens.createdAt
      })
      .from(users)
      .leftJoin(tokens, eq(users.id, tokens.userId))
      .orderBy(desc(tokens.balance));

    const tokenData = usersWithTokens.map(user => ({
      userId: user.userId,
      username: user.username,
      role: user.role,
      balance: user.balance || 0,
      expiresAt: user.expiresAt,
      lastUsedAt: user.lastUsedAt,
      hasTokens: (user.balance || 0) > 0 && (!user.expiresAt || new Date(user.expiresAt) > new Date())
    }));

    res.json(tokenData);
  } catch (error: any) {
    console.error("Error fetching all token balances:", error);
    res.status(500).json({ message: "Failed to fetch token balances" });
  }
}