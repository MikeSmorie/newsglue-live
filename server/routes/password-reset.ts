import express from "express";
import { z } from "zod";
import { db } from "@db";
import { users, passwordResetTokens } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = express.Router();

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Forgot password endpoint
router.post("/forgot-password", async (req, res) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues,
      });
    }

    const { email } = result.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: "If an account with that email exists, a password reset link has been sent."
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Clean up any existing tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // Create new reset token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt: expiresAt,
    });

    // TODO: Send email with reset link
    // For now, we'll log the token (in production, send via SendGrid)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: ${req.get('origin') || 'http://localhost:5000'}/reset-password?token=${resetToken}`);

    res.json({
      message: "If an account with that email exists, a password reset link has been sent.",
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken, 
        resetLink: `${req.get('origin') || 'http://localhost:5000'}/reset-password?token=${resetToken}`
      })
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Reset password endpoint
router.post("/reset-password", async (req, res) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues,
      });
    }

    const { token, password } = result.data;

    // Find valid, unexpired token
    const [resetTokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email
        }
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.usedAt, null)
        )
      )
      .limit(1);

    if (!resetTokenRecord) {
      return res.status(400).json({
        message: "Invalid or expired reset token"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, resetTokenRecord.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetTokenRecord.id));

    console.log(`Password reset successful for user: ${resetTokenRecord.user.username}`);

    res.json({
      message: "Password has been reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Validate reset token endpoint (for frontend validation)
router.get("/validate-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: "Token is required"
      });
    }

    // Check if token exists and is valid
    const [resetTokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (!resetTokenRecord) {
      return res.json({
        valid: false,
        message: "Invalid token"
      });
    }

    if (resetTokenRecord.usedAt) {
      return res.json({
        valid: false,
        message: "Token has already been used"
      });
    }

    if (new Date() > resetTokenRecord.expiresAt) {
      return res.json({
        valid: false,
        message: "Token has expired"
      });
    }

    res.json({
      valid: true,
      message: "Token is valid"
    });

  } catch (error) {
    console.error("Validate token error:", error);
    res.status(500).json({
      valid: false,
      message: "Internal server error"
    });
  }
});

export { router as passwordResetRouter };