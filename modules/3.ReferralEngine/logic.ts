import { 
  getOrCreateReferralCode as dbGetOrCreateReferralCode,
  findReferralByCode,
  hasUserRedeemedReferral,
  createReferralRedemption,
  awardTokens
} from "./db";
import type { RedemptionResult } from "./types";

/**
 * Get or create a referral code for a user
 */
export async function getOrCreateReferralCode(userId: number, username: string): Promise<string> {
  return await dbGetOrCreateReferralCode(userId, username);
}

/**
 * Redeem a referral code
 */
export async function redeemReferral(referralCode: string, refereeId: number): Promise<RedemptionResult> {
  try {
    // Check if the referral code exists
    const referral = await findReferralByCode(referralCode);
    if (!referral) {
      return {
        success: false,
        message: "Invalid referral code. Please check and try again."
      };
    }

    // Check if the user is trying to redeem their own code
    if (referral.userId === refereeId) {
      return {
        success: false,
        message: "You cannot redeem your own referral code."
      };
    }

    // Check if the user has already redeemed a referral code
    const hasRedeemed = await hasUserRedeemedReferral(refereeId);
    if (hasRedeemed) {
      return {
        success: false,
        message: "You have already redeemed a referral code."
      };
    }

    // Create the redemption record
    const redemption = await createReferralRedemption(referral.userId, refereeId, 50);

    // Award tokens to both referrer and referee
    await awardTokens(referral.userId, 50); // Referrer gets 50 tokens
    await awardTokens(refereeId, 50); // Referee gets 50 tokens

    return {
      success: true,
      message: "Referral code redeemed successfully! You and your friend both received 50 tokens.",
      redemption
    };
  } catch (error) {
    console.error("Error redeeming referral:", error);
    return {
      success: false,
      message: "An error occurred while redeeming the referral code. Please try again."
    };
  }
}

/**
 * Validate a referral code format
 */
export function validateReferralCode(code: string): boolean {
  // Basic validation: 6-20 characters, alphanumeric
  return /^[A-Z0-9]{6,20}$/.test(code.toUpperCase());
}

/**
 * Generate a referral link
 */
export function generateReferralLink(baseUrl: string, referralCode: string): string {
  return `${baseUrl}/register?ref=${referralCode}`;
}