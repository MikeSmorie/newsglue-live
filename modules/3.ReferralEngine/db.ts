import { db } from "../../db";
import { referrals, referralRedemptions, users, tokens } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ReferralRecord, RedemptionEntry, ReferralStats } from "./types";

// Create a new referral code for a user
export async function createReferral(userId: number, referralCode: string): Promise<ReferralRecord> {
  const [referral] = await db
    .insert(referrals)
    .values({
      userId,
      referralCode,
    })
    .returning();

  return referral;
}

// Get referral by code
export async function getReferralByCode(referralCode: string): Promise<ReferralRecord | null> {
  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referralCode, referralCode))
    .limit(1);

  return referral || null;
}

// Get referral by user ID
export async function getReferralByUserId(userId: number): Promise<ReferralRecord | null> {
  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.userId, userId))
    .limit(1);

  return referral || null;
}

// Check if user has already redeemed a referral
export async function hasUserRedeemedReferral(userId: number): Promise<boolean> {
  const [redemption] = await db
    .select()
    .from(referralRedemptions)
    .where(eq(referralRedemptions.refereeId, userId))
    .limit(1);

  return !!redemption;
}

// Create a referral redemption
export async function createReferralRedemption(
  referrerId: number,
  refereeId: number,
  rewardAmount: number = 50
): Promise<RedemptionEntry> {
  const [redemption] = await db
    .insert(referralRedemptions)
    .values({
      referrerId,
      refereeId,
      rewardAmount,
    })
    .returning();

  return redemption;
}

// Get referral redemptions for a user (as referrer)
export async function getReferralRedemptions(userId: number): Promise<RedemptionEntry[]> {
  const redemptions = await db
    .select()
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referrerId, userId))
    .orderBy(desc(referralRedemptions.redeemedAt));

  return redemptions;
}

// Get referral statistics for a user
export async function getReferralStats(userId: number): Promise<ReferralStats> {
  const redemptions = await getReferralRedemptions(userId);
  const totalRedemptions = redemptions.length;
  const totalRewards = redemptions.reduce((sum, redemption) => sum + redemption.rewardAmount, 0);
  const recentRedemptions = redemptions.slice(0, 5); // Last 5 redemptions

  return {
    totalReferrals: 1, // Each user has one referral code
    totalRedemptions,
    totalRewards,
    recentRedemptions,
  };
}

// Add tokens to user balance
export async function addTokensToUser(userId: number, amount: number): Promise<void> {
  // Get or create token record for user
  const [existingTokens] = await db
    .select()
    .from(tokens)
    .where(eq(tokens.userId, userId))
    .limit(1);

  if (existingTokens) {
    // Update existing balance
    await db
      .update(tokens)
      .set({
        balance: existingTokens.balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(tokens.userId, userId));
  } else {
    // Create new token record
    await db
      .insert(tokens)
      .values({
        userId,
        balance: amount,
      });
  }
}

// Get user by referral code (for validation)
export async function getUserByReferralCode(referralCode: string): Promise<{ id: number; username: string } | null> {
  const [result] = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .innerJoin(referrals, eq(referrals.userId, users.id))
    .where(eq(referrals.referralCode, referralCode))
    .limit(1);

  return result || null;
}

// Check if referral code exists and is valid
export async function validateReferralCode(referralCode: string): Promise<boolean> {
  const referral = await getReferralByCode(referralCode);
  return !!referral;
}