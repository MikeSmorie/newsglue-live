import { db } from "../../db";
import { referrals, referralRedemptions, users } from "../../db/schema";
import { eq, and, desc, count, sum } from "drizzle-orm";
import type { ReferralStats, ReferralRedemption } from "./types";

/**
 * Get or create a referral code for a user
 */
export async function getOrCreateReferralCode(userId: number, username: string): Promise<string> {
  // Check if user already has a referral code
  const existingReferral = await db.query.referrals.findFirst({
    where: eq(referrals.userId, userId),
  });

  if (existingReferral) {
    return existingReferral.referralCode;
  }

  // Generate a unique referral code based on username + random suffix
  const baseCode = username.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referralCode = `${baseCode}${randomSuffix}`;

  // Insert new referral code
  await db.insert(referrals).values({
    userId,
    referralCode,
    createdAt: new Date(),
  });

  return referralCode;
}

/**
 * Find a referral by code
 */
export async function findReferralByCode(referralCode: string) {
  return await db.query.referrals.findFirst({
    where: eq(referrals.referralCode, referralCode),
  });
}

/**
 * Check if a user has already redeemed a referral code
 */
export async function hasUserRedeemedReferral(userId: number): Promise<boolean> {
  const redemption = await db.query.referralRedemptions.findFirst({
    where: eq(referralRedemptions.refereeId, userId),
  });

  return !!redemption;
}

/**
 * Create a referral redemption record
 */
export async function createReferralRedemption(
  referrerId: number,
  refereeId: number,
  rewardAmount: number = 50
): Promise<ReferralRedemption> {
  const redemption = await db.insert(referralRedemptions).values({
    referrerId,
    refereeId,
    rewardAmount,
    redeemedAt: new Date(),
  }).returning();

  return {
    id: redemption[0].id,
    referrerId: redemption[0].referrerId,
    refereeId: redemption[0].refereeId,
    redeemedAt: redemption[0].redeemedAt,
    rewardAmount: redemption[0].rewardAmount,
  };
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: number): Promise<ReferralStats> {
  // Get total redemptions count and total rewards
  const statsQuery = await db
    .select({
      totalRedemptions: count(referralRedemptions.id),
      totalRewards: sum(referralRedemptions.rewardAmount),
    })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referrerId, userId));

  const stats = statsQuery[0];
  const totalRedemptions = stats.totalRedemptions || 0;
  const totalRewards = Number(stats.totalRewards) || 0;

  return {
    totalReferrals: totalRedemptions, // Same as redemptions for now
    totalRedemptions,
    totalRewards,
    recentRedemptions: [],
  };
}

/**
 * Get recent referral redemptions for a user
 */
export async function getReferralRedemptions(userId: number): Promise<Array<{
  id: number;
  redeemedAt: string;
  rewardAmount: number;
  refereeId: number;
}>> {
  const redemptions = await db.query.referralRedemptions.findMany({
    where: eq(referralRedemptions.referrerId, userId),
    orderBy: [desc(referralRedemptions.redeemedAt)],
    limit: 10,
  });

  return redemptions.map(redemption => ({
    id: redemption.id,
    redeemedAt: redemption.redeemedAt.toISOString(),
    rewardAmount: redemption.rewardAmount,
    refereeId: redemption.refereeId,
  }));
}

/**
 * Award tokens to a user (integrates with existing token system)
 */
export async function awardTokens(userId: number, amount: number): Promise<void> {
  // This function should integrate with your existing token system
  // For now, we'll update the user's token balance directly
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user) {
    const currentTokens = user.tokens || 0;
    await db.update(users)
      .set({ tokens: currentTokens + amount })
      .where(eq(users.id, userId));
  }
}