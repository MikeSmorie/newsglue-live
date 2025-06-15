import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Share2, Gift, Users, TrendingUp } from "lucide-react";
import { referralCodeSchema, type ReferralCodeFormData } from "./types";

interface ReferralStats {
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

interface ReferralData {
  referralCode: string;
  referralLink: string;
}

export default function ReferralEngine() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReferralCodeFormData>({
    resolver: zodResolver(referralCodeSchema),
    defaultValues: {
      referralCode: "",
    },
  });

  // Fetch user's referral code and stats
  useEffect(() => {
    fetchReferralData();
    fetchReferralStats();
  }, []);

  const fetchReferralData = async () => {
    try {
      const response = await fetch("/api/referrals/code", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        setReferralData(data.data);
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferralStats = async () => {
    try {
      const response = await fetch("/api/referrals/history", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Referral code copied successfully!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy referral code to clipboard",
      });
    }
  };

  const shareReferralLink = async () => {
    if (!referralData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join using my referral",
          text: "Join and we both get rewards!",
          url: referralData.referralLink,
        });
      } catch (error) {
        // User cancelled or share failed, fall back to clipboard
        copyToClipboard(referralData.referralLink);
      }
    } else {
      copyToClipboard(referralData.referralLink);
    }
  };

  const onRedeemSubmit = async (data: ReferralCodeFormData) => {
    setIsRedeeming(true);
    try {
      const response = await fetch("/api/referrals/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Referral redeemed!",
          description: result.message,
        });
        form.reset();
        fetchReferralStats(); // Refresh stats
      } else {
        toast({
          variant: "destructive",
          title: "Redemption failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to redeem referral code",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refer & Earn</h1>
        <p className="text-muted-foreground">
          Share your referral code and earn tokens when friends join
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Your Referral Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share this code with friends to earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralData && (
              <>
                <div className="flex items-center space-x-2">
                  <Input
                    value={referralData.referralCode}
                    readOnly
                    className="font-mono text-lg font-bold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(referralData.referralCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  onClick={shareReferralLink}
                  className="w-full"
                  variant="default"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Referral Link
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>When someone uses your code:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>They get 50 tokens</li>
                    <li>You get 50 tokens</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Redeem Referral Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Redeem Referral Code
            </CardTitle>
            <CardDescription>
              Enter a friend's referral code to earn tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onRedeemSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter referral code"
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isRedeeming}
                >
                  {isRedeeming ? "Redeeming..." : "Redeem Code"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Referral Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral Statistics
            </CardTitle>
            <CardDescription>
              Your referral performance and earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalRedemptions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Successful Referrals
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalRewards}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tokens Earned
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.recentRedemptions.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Recent Activity
                </div>
              </div>
            </div>

            {stats.recentRedemptions.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="font-semibold mb-2">Recent Referrals</h4>
                  <div className="space-y-2">
                    {stats.recentRedemptions.slice(0, 5).map((redemption) => (
                      <div
                        key={redemption.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="text-sm">
                          Referral #{redemption.refereeId}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            +{redemption.rewardAmount} tokens
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {new Date(redemption.redeemedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}