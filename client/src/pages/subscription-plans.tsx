import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Lock, Star, Zap, Users, MessageSquare, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PayPalButton from "@/components/PayPalButton";

interface Module {
  id: number;
  name: string;
  description?: string;
  requiredTier: string;
  hasAccess: boolean;
  isLocked: boolean;
}

interface UserData {
  id: number;
  username: string;
  subscriptionPlan: string;
  role: string;
}

const TIER_FEATURES = {
  free: {
    modules: 3,
    support: "Community",
    aiFeatures: "Limited",
    storage: "1GB",
    users: "1 User",
    priority: "Low",
    color: "bg-gray-100 border-gray-300",
    badge: "bg-gray-500"
  },
  pro: {
    modules: 7,
    support: "Priority",
    aiFeatures: "Full",
    storage: "10GB",
    users: "5 Users",
    priority: "High",
    color: "bg-blue-50 border-blue-300",
    badge: "bg-blue-500"
  },
  enterprise: {
    modules: 10,
    support: "24/7 Dedicated",
    aiFeatures: "Extended + Custom",
    storage: "Unlimited",
    users: "Unlimited",
    priority: "Highest",
    color: "bg-purple-50 border-purple-300",
    badge: "bg-purple-500"
  }
};

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user data");
      return res.json();
    }
  });

  const { data: modulesData } = useQuery<{
    modules: Module[];
    userTier: string;
    totalModules: number;
    accessibleModules: number;
  }>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      const res = await fetch("/api/modules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
    enabled: !!userData
  });

  const handleUpgrade = async (tier: string) => {
    try {
      setSelectedPlan(tier);
      
      // Here you would integrate with your payment system
      toast({
        title: "Upgrade Initiated",
        description: `Starting upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan...`,
      });

      // Simulate upgrade process
      setTimeout(() => {
        toast({
          title: "Upgrade Successful",
          description: `You've been upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan!`,
        });
        setSelectedPlan(null);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Upgrade Failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
      setSelectedPlan(null);
    }
  };

  const currentTier = userData?.subscriptionPlan || "free";
  const modules = modulesData?.modules || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that fits your needs
        </p>
        {userData && (
          <Badge variant="outline" className="text-lg py-1 px-3">
            Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </Badge>
        )}
      </div>

      {/* Plan Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Plan Comparison
          </CardTitle>
          <CardDescription>
            Compare features across all subscription tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Feature</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">Pro</TableHead>
                <TableHead className="text-center">Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Modules Access</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.free.modules} modules</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.pro.modules} modules</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.enterprise.modules} modules</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Support Level</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.free.support}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.pro.support}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.enterprise.support}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">AI Features</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.free.aiFeatures}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.pro.aiFeatures}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.enterprise.aiFeatures}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Storage</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.free.storage}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.pro.storage}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.enterprise.storage}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Team Size</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.free.users}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.pro.users}</TableCell>
                <TableCell className="text-center">{TIER_FEATURES.enterprise.users}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(TIER_FEATURES).map(([tier, features]) => {
          const isCurrentPlan = currentTier === tier;
          const canUpgrade = currentTier === "free" && tier !== "free" || 
                           currentTier === "pro" && tier === "enterprise";

          return (
            <Card key={tier} className={`relative ${features.color} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                  Current Plan
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {tier === "free" && <Users className="h-6 w-6" />}
                  {tier === "pro" && <Zap className="h-6 w-6" />}
                  {tier === "enterprise" && <Star className="h-6 w-6" />}
                  <CardTitle className="capitalize text-2xl">{tier}</CardTitle>
                </div>
                <div className="text-3xl font-bold">
                  {tier === "free" ? "Free" : tier === "pro" ? "$29/mo" : "$99/mo"}
                </div>
                {tier !== "free" && (
                  <p className="text-sm text-muted-foreground">Billed monthly</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{features.modules} modules included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{features.support} support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">{features.aiFeatures} AI features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">{features.priority} priority</span>
                  </div>
                </div>

                {canUpgrade && (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleUpgrade(tier)}
                      disabled={selectedPlan === tier}
                      className="w-full"
                    >
                      {selectedPlan === tier ? "Processing..." : `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">or</div>
                    <div className="flex justify-center">
                      <PayPalButton
                        amount={tier === "pro" ? "29.00" : "99.00"}
                        currency="USD"
                        intent="CAPTURE"
                      />
                    </div>
                  </div>
                )}

                {isCurrentPlan && (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                )}

                {tier === "free" && currentTier !== "free" && (
                  <Button variant="ghost" className="w-full" disabled>
                    Downgrade Available
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Module Access Overview */}
      {modulesData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Your Module Access
            </CardTitle>
            <CardDescription>
              Modules available with your current {currentTier} plan ({modulesData.accessibleModules} of {modulesData.totalModules} modules accessible)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {modules.map((module) => (
                <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {module.hasAccess ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h4 className="font-medium">{module.name}</h4>
                      {module.description && (
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={module.hasAccess ? "default" : "secondary"}
                      className={module.hasAccess ? "bg-green-500" : ""}
                    >
                      {module.requiredTier}
                    </Badge>
                    {module.isLocked && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Navigate to upgrade page or show upgrade modal
                          window.location.href = `/locked-module?name=${encodeURIComponent(module.name)}`;
                        }}
                      >
                        Upgrade to Access
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}