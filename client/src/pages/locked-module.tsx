import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, ArrowRight, Crown, Zap, Star } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  subscriptionPlan: string;
  role: string;
}

const TIER_INFO = {
  free: {
    name: "Free",
    color: "bg-gray-100 text-gray-800",
    icon: Star,
    features: ["3 modules", "Community support", "Basic AI features"]
  },
  pro: {
    name: "Pro",
    color: "bg-blue-100 text-blue-800",
    icon: Zap,
    features: ["7 modules", "Priority support", "Full AI features", "10GB storage"]
  },
  enterprise: {
    name: "Enterprise",
    color: "bg-purple-100 text-purple-800",
    icon: Crown,
    features: ["10 modules", "24/7 dedicated support", "Extended AI features", "Unlimited storage"]
  }
};

export default function LockedModule() {
  const searchParams = new URLSearchParams(window.location.search);
  const moduleName = searchParams.get("name") || "Unknown Module";

  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user data");
      return res.json();
    }
  });

  const { data: moduleInfo } = useQuery<{
    module: {
      id: number;
      name: string;
      description?: string;
      requiredTier: string;
    };
    hasAccess: boolean;
    userTier: string;
    requiredTier: string;
  }>({
    queryKey: ["/api/modules", moduleName, "access"],
    queryFn: async () => {
      const res = await fetch(`/api/modules/${encodeURIComponent(moduleName)}/access`, {
        credentials: "include"
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403) {
          return errorData; // Return the error data for 403 responses
        }
        throw new Error("Failed to fetch module info");
      }
      return res.json();
    },
    enabled: !!userData
  });

  if (!userData) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-muted-foreground mb-6">Please log in to access modules.</p>
        <Link href="/login">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  const currentTier = userData.subscriptionPlan;
  const requiredTier = moduleInfo?.requiredTier || "pro";
  const currentTierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];
  const requiredTierInfo = TIER_INFO[requiredTier as keyof typeof TIER_INFO];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="text-center space-y-6">
        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="h-12 w-12 text-red-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
          <p className="text-xl text-muted-foreground">
            The module "{moduleName}" requires a higher subscription plan
          </p>
        </div>

        {/* Current vs Required Tiers */}
        <div className="flex justify-center items-center gap-6 py-6">
          <Card className="border-2">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                {currentTierInfo && <currentTierInfo.icon className="h-6 w-6" />}
              </div>
              <CardTitle className="text-lg">Your Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Badge className={currentTierInfo?.color || "bg-gray-100"}>
                {currentTierInfo?.name || currentTier}
              </Badge>
            </CardContent>
          </Card>

          <ArrowRight className="h-8 w-8 text-muted-foreground" />

          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                {requiredTierInfo && <requiredTierInfo.icon className="h-6 w-6 text-green-600" />}
              </div>
              <CardTitle className="text-lg">Required Plan</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Badge className="bg-green-600 text-white">
                {requiredTierInfo?.name || requiredTier}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Module Information */}
        {moduleInfo?.module && (
          <Alert className="text-left max-w-2xl mx-auto">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>{moduleInfo.module.name}</strong>
              {moduleInfo.module.description && (
                <span>: {moduleInfo.module.description}</span>
              )}
              <br />
              <span className="text-sm text-muted-foreground">
                This module requires a {requiredTier} subscription or higher.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Required Tier Benefits */}
        {requiredTierInfo && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <requiredTierInfo.icon className="h-5 w-5" />
                {requiredTierInfo.name} Plan Benefits
              </CardTitle>
              <CardDescription>
                What you'll get when you upgrade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {requiredTierInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Link href="/subscription-plans">
            <Button size="lg" className="w-full sm:w-auto">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </Link>
          
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Questions about upgrading?{" "}
            <Link href="/support" className="text-primary hover:underline">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}