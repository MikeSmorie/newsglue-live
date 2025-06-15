import { z } from "zod";

export const referralCodeSchema = z.object({
  referralCode: z.string().min(6, "Referral code must be at least 6 characters").max(20, "Referral code must be less than 20 characters"),
});

export type ReferralCodeFormData = z.infer<typeof referralCodeSchema>;

export interface ReferralStats {
  totalReferrals: number;
  totalRedemptions: number;
  totalRewards: number;
  recentRedemptions: Array<{
    id: number;
    redeemedAt: string;
    rewardAmount: number;
    refereeId: number;
  }>;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
}

export interface ReferralRedemption {
  id: number;
  referrerId: number;
  refereeId: number;
  redeemedAt: Date;
  rewardAmount: number;
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  redemption?: ReferralRedemption;
}