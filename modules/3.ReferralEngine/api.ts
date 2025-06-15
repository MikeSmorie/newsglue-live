import { Router } from "express";
import { getOrCreateReferralCode, redeemReferral } from "./logic";
import { getReferralStats, getReferralRedemptions } from "./db";
import { referralCodeSchema } from "./types";
import { logEvent } from "../../lib/logs";

export const referralRouter = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Get user's referral code
referralRouter.get("/code", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    
    const referralCode = await getOrCreateReferralCode(userId, username);
    
    await logEvent("user_action", "Referral code accessed", {
      userId,
      userRole: req.user.role,
      endpoint: "/api/referrals/code",
    });
    
    res.json({
      success: true,
      data: {
        referralCode,
        referralLink: `${req.protocol}://${req.get('host')}/register?ref=${referralCode}`
      }
    });
  } catch (error) {
    console.error("Error getting referral code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referral code"
    });
  }
});

// Redeem a referral code
referralRouter.post("/redeem", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { referralCode } = req.body;
    
    // Validate input
    const validation = referralCodeSchema.safeParse({ referralCode });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code format"
      });
    }
    
    const result = await redeemReferral(referralCode, userId);
    
    await logEvent("user_action", `Referral redemption ${result.success ? 'successful' : 'failed'}`, {
      userId,
      userRole: req.user.role,
      endpoint: "/api/referrals/redeem",
      metadata: { referralCode, success: result.success }
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.redemption
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error redeeming referral:", error);
    res.status(500).json({
      success: false,
      message: "Failed to redeem referral code"
    });
  }
});

// Get referral history and statistics
referralRouter.get("/history", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const [stats, redemptions] = await Promise.all([
      getReferralStats(userId),
      getReferralRedemptions(userId)
    ]);
    
    await logEvent("user_action", "Referral history accessed", {
      userId,
      userRole: req.user.role,
      endpoint: "/api/referrals/history",
    });
    
    res.json({
      success: true,
      data: {
        stats,
        redemptions: redemptions.map(redemption => ({
          id: redemption.id,
          redeemedAt: redemption.redeemedAt,
          rewardAmount: redemption.rewardAmount,
          refereeId: redemption.refereeId
        }))
      }
    });
  } catch (error) {
    console.error("Error getting referral history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referral history"
    });
  }
});

// Get referral statistics summary
referralRouter.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const stats = await getReferralStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error getting referral stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referral statistics"
    });
  }
});

export default referralRouter;