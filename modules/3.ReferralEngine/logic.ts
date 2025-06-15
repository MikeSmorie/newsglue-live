import { 
  createReferral, 
  getReferralByCode, 
  getReferralByUserId, 
  hasUserRedeemedReferral, 
  createReferralRedemption, 
  addTokensToUser, 
  getUserByReferralCode,
  validateReferralCode 
} from "./db";
import type { ReferralRecord, RedemptionEntry } from "./types";

// Generate a unique referral code
export function generateReferralCode(username: string): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userPrefix = username.substring(0, 3).toUpperCase();
  
  return `${userPrefix}${timestamp}${randomSuffix}`;
}

// Create or get referral code for user
export async function getOrCreateReferralCode(userId: number, username: string): Promise<string> {
  // Check if user already has a referral code
  const existingReferral = await getReferralByUserId(userId);
  
  if (existingReferral) {
    return existingReferral.referralCode;
  }
  
  // Generate new referral code
  let referralCode = generateReferralCode(username);
  let attempts = 0;
  const maxAttempts = 5;
  
  // Ensure uniqueness
  while (attempts < maxAttempts) {
    const existing = await getReferralByCode(referralCode);
    if (!existing) {
      break;
    }
    referralCode = generateReferralCode(username);
    attempts++;
  }
  
  if (attempts === maxAttempts) {
    throw new Error("Unable to generate unique referral code");
  }
  
  // Create the referral record
  const referral = await createReferral(userId, referralCode);
  return referral.referralCode;
}

// Validate referral code and check business rules
export async function validateReferral(referralCode: string, userId: number): Promise<{
  valid: boolean;
  message: string;
  referrer?: { id: number; username: string };
}> {
  // Check if referral code exists
  const isValidCode = await validateReferralCode(referralCode);
  if (!isValidCode) {
    return {
      valid: false,
      message: "Invalid referral code"
    };
  }
  
  // Get the referrer
  const referrer = await getUserByReferralCode(referralCode);
  if (!referrer) {
    return {
      valid: false,
      message: "Referral code not found"
    };
  }
  
  // Prevent self-referral
  if (referrer.id === userId) {
    return {
      valid: false,
      message: "You cannot use your own referral code"
    };
  }
  
  // Check if user has already redeemed a referral
  const hasRedeemed = await hasUserRedeemedReferral(userId);
  if (hasRedeemed) {
    return {
      valid: false,
      message: "You have already redeemed a referral code"
    };
  }
  
  return {
    valid: true,
    message: "Referral code is valid",
    referrer
  };
}

// Redeem referral and distribute rewards
export async function redeemReferral(referralCode: string, userId: number): Promise<{
  success: boolean;
  message: string;
  redemption?: RedemptionEntry;
}> {
  try {
    // Validate the referral
    const validation = await validateReferral(referralCode, userId);
    
    if (!validation.valid || !validation.referrer) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    const referrerId = validation.referrer.id;
    const rewardAmount = 50; // Default reward amount
    
    // Create the redemption record
    const redemption = await createReferralRedemption(referrerId, userId, rewardAmount);
    
    // Reward both parties
    await Promise.all([
      addTokensToUser(referrerId, rewardAmount), // Reward referrer
      addTokensToUser(userId, rewardAmount),     // Reward referee
    ]);
    
    return {
      success: true,
      message: `Referral redeemed successfully! Both you and ${validation.referrer.username} received ${rewardAmount} tokens.`,
      redemption
    };
  } catch (error) {
    console.error("Error redeeming referral:", error);
    return {
      success: false,
      message: "An error occurred while redeeming the referral code"
    };
  }
}

// Calculate referral rewards based on tier or custom logic
export function calculateReferralReward(referrerTier: string = "free"): number {
  const rewardTiers = {
    free: 50,
    pro: 100,
    enterprise: 200
  };
  
  return rewardTiers[referrerTier as keyof typeof rewardTiers] || 50;
}

// Check if referral code format is valid
export function isValidReferralCodeFormat(code: string): boolean {
  // Basic format validation: 8-20 characters, alphanumeric
  const codeRegex = /^[A-Z0-9]{8,20}$/;
  return codeRegex.test(code);
}

// Get referral link for sharing
export function generateReferralLink(referralCode: string, baseUrl: string = ""): string {
  return `${baseUrl}/register?ref=${referralCode}`;
}