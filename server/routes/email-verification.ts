import express from "express";
import { z } from "zod";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = express.Router();

const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Send verification email endpoint
router.post("/send-verification", async (req, res) => {
  try {
    const result = resendVerificationSchema.safeParse(req.body);
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

    if (!user) {
      // Return success to prevent email enumeration
      return res.json({
        message: "If an account with that email exists and is unverified, a verification email has been sent."
      });
    }

    if (user.isVerified) {
      return res.json({
        message: "This email address is already verified."
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update user with verification token
    await db
      .update(users)
      .set({ verificationToken: verificationToken })
      .where(eq(users.id, user.id));

    // TODO: Send verification email
    console.log(`Email verification token for ${email}: ${verificationToken}`);
    console.log(`Verification link: ${req.get('origin') || 'http://localhost:5000'}/verify-email?token=${verificationToken}`);

    res.json({
      message: "If an account with that email exists and is unverified, a verification email has been sent.",
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { 
        verificationToken, 
        verificationLink: `${req.get('origin') || 'http://localhost:5000'}/verify-email?token=${verificationToken}`
      })
    });

  } catch (error) {
    console.error("Send verification error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Verify email endpoint - GET route as specified
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        message: "Verification token is required"
      });
    }

    // Find user with verification token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification token"
      });
    }

    if (user.isVerified) {
      return res.json({
        message: "Email address is already verified"
      });
    }

    // Mark user as verified and clear token
    await db
      .update(users)
      .set({ 
        isVerified: true, 
        verificationToken: null 
      })
      .where(eq(users.id, user.id));

    console.log(`Email verified for user: ${user.username}`);

    res.json({
      message: "Email address has been successfully verified"
    });

  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Check verification status endpoint
router.get("/status/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !z.string().email().safeParse(email).success) {
      return res.status(400).json({
        message: "Valid email address is required"
      });
    }

    // Find user by email
    const [user] = await db
      .select({
        isVerified: users.isVerified,
        email: users.email
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      email: user.email,
      isVerified: user.isVerified
    });

  } catch (error) {
    console.error("Check verification status error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Validate verification token endpoint (for frontend validation)
router.get("/validate-verification-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: "Token is required"
      });
    }

    // Check if token exists and is valid
    const [user] = await db
      .select({
        id: users.id,
        isVerified: users.isVerified,
        email: users.email
      })
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      return res.json({
        valid: false,
        message: "Invalid verification token"
      });
    }

    if (user.isVerified) {
      return res.json({
        valid: false,
        message: "Email address is already verified"
      });
    }

    res.json({
      valid: true,
      message: "Token is valid",
      email: user.email
    });

  } catch (error) {
    console.error("Validate verification token error:", error);
    res.status(500).json({
      valid: false,
      message: "Internal server error"
    });
  }
});

export { router as emailVerificationRouter };