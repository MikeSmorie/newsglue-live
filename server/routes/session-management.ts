import express from "express";
import { z } from "zod";
import { db } from "@db";
import { users } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticateJWT, requireSupergod } from "../middleware/jwt-auth";

const router = express.Router();

const invalidateSessionsSchema = z.object({
  userId: z.number().int().positive("Valid user ID is required"),
});

// Invalidate all sessions for a specific user (Supergod only)
router.post("/users/:id/invalidate-sessions", authenticateJWT, requireSupergod, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    // Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Increment token version to invalidate all existing tokens
    const [updatedUser] = await db
      .update(users)
      .set({ 
        tokenVersion: user.tokenVersion + 1 
      })
      .where(eq(users.id, userId))
      .returning();

    console.log(`All sessions invalidated for user: ${user.username} (ID: ${userId}) by admin: ${req.user?.username}`);

    res.json({
      message: `All sessions invalidated for user: ${user.username}`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        tokenVersion: updatedUser.tokenVersion
      }
    });

  } catch (error) {
    console.error("Session invalidation error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Get user's current token version (for debugging)
router.get("/users/:id/token-version", authenticateJWT, requireSupergod, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        tokenVersion: users.tokenVersion
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      user: user
    });

  } catch (error) {
    console.error("Get token version error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Bulk invalidate sessions for multiple users
router.post("/bulk-invalidate-sessions", authenticateJWT, requireSupergod, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "userIds must be a non-empty array"
      });
    }

    // Validate all user IDs are numbers
    const validUserIds = userIds.filter(id => Number.isInteger(id) && id > 0);
    
    if (validUserIds.length === 0) {
      return res.status(400).json({
        message: "No valid user IDs provided"
      });
    }

    // Increment token version for all specified users
    const updatedUsers = await db
      .update(users)
      .set({ 
        tokenVersion: sql`${users.tokenVersion} + 1`
      })
      .where(sql`${users.id} = ANY(${validUserIds})`)
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        tokenVersion: users.tokenVersion
      });

    console.log(`Bulk session invalidation completed for ${updatedUsers.length} users by admin: ${req.user?.username}`);

    res.json({
      message: `Sessions invalidated for ${updatedUsers.length} users`,
      affectedUsers: updatedUsers
    });

  } catch (error) {
    console.error("Bulk session invalidation error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

export { router as sessionManagementRouter };