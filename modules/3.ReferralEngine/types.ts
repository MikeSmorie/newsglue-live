import { z } from "zod";

// Referral status enum
export const referralStatusEnum = z.enum(["active", "redeemed", "expired"]);
export type ReferralStatus = z.infer<typeof referralStatusEnum>;

// Base referral record type
export interface ReferralRecord {
  id: number;
  userId: number;
  referralCode: string;
  createdAt: Date;
}

// Referral redemption entry type
export interface RedemptionEntry {
  id: number;
  referrerId: number;
  refereeId: number;
  redeemedAt: Date;
  rewardAmount: number;
}

// Extended referral record with redemption info
export interface ReferralWithRedemptions extends ReferralRecord {
  redemptions: RedemptionEntry[];
  totalRedemptions: number;
  totalRewards: number;
}

// Referral statistics
export interface ReferralStats {
  totalReferrals: number;
  totalRedemptions: number;
  totalRewards: number;
  recentRedemptions: RedemptionEntry[];
}

// API request/response types
export interface CreateReferralRequest {
  userId: number;
}

export interface RedeemReferralRequest {
  referralCode: string;
  userId: number;
}

export interface ReferralResponse {
  success: boolean;
  message: string;
  data?: ReferralRecord | RedemptionEntry | ReferralStats;
}

// Form validation schemas
export const referralCodeSchema = z.object({
  referralCode: z.string().min(6, "Referral code must be at least 6 characters").max(20, "Referral code must be less than 20 characters"),
});

export type ReferralCodeFormData = z.infer<typeof referralCodeSchema>;