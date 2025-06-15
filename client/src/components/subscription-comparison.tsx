import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Minus, AlertCircle, Crown, Star, Clock } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { PaymentProviderButtons } from "@/components/PaymentProviderButtons";

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  annualPrice?: number;
  trialDays?: number;
  isPopular?: boolean;
  perks?: string[];
}

interface Feature {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface PlanFeature {
  planId: number;
  featureId: number;
  enabled: boolean;
}

interface SubscriptionOverride {
  userId: number;
  overriddenByAdmin: boolean;
  overrideDate?: string;
  proRatedAmount?: number;
}

export function SubscriptionComparison() {
  const { user } = useUser();
  const [, navigate] = useLocation();

  // Fetch plans, features, and current subscription with shorter polling interval
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    refetchInterval: 5000,
  });

  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
    refetchInterval: 5000,
  });

  const { data: planFeatures = [] } = useQuery<PlanFeature[]>({
    queryKey: ["/api/features/assignments"],
    refetchInterval: 5000,
  });

  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: subscriptionOverride } = useQuery<SubscriptionOverride>({
    queryKey: ["/api/subscription/override-info", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Helper function to check if a feature is enabled for a plan
  const isFeatureEnabled = (planId: number, featureId: number) => {
    return planFeatures.some(
      (pf) => pf.planId === planId && pf.featureId === featureId && pf.enabled
    );
  };

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Plan Comparison</CardTitle>
        <CardDescription>Compare features across different subscription levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Feature</TableHead>
                {plans.map((plan) => (
                  <TableHead key={plan.id} className="text-center">
                    <div className="space-y-1 relative">
                      {plan.isPopular && (
                        <Badge variant="default" className="absolute -top-8 left-1/2 -translate-x-1/2">
                          Most Popular
                        </Badge>
                      )}
                      <div className="font-bold relative">
                        {plan.name}
                        {currentPlan?.id === plan.id && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                              Current Plan
                            </span>
                            {subscriptionOverride?.overriddenByAdmin && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Your subscription was upgraded by an admin on {new Date(subscriptionOverride.overrideDate || '').toLocaleDateString()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          ${plan.price}/month
                        </div>
                        {plan.annualPrice && (
                          <div className="text-xs text-muted-foreground">
                            or ${plan.annualPrice}/year
                            <span className="text-green-500 ml-1">
                              Save {Math.round(((plan.price * 12 - plan.annualPrice) / (plan.price * 12)) * 100)}%
                            </span>
                          </div>
                        )}
                        {plan.trialDays && (
                          <div className="flex items-center justify-center gap-1 text-xs text-primary">
                            <Clock className="h-3 w-3" />
                            {plan.trialDays} days free trial
                          </div>
                        )}
                      </div>
                      {plan.perks && plan.perks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {plan.perks.map((perk, index) => (
                            <div key={index} className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {perk}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                <>
                  <TableRow key={`category-${category}`}>
                    <TableCell
                      colSpan={plans.length + 1}
                      className="bg-muted/50 font-semibold"
                    >
                      {category}
                    </TableCell>
                  </TableRow>
                  {categoryFeatures.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell className="font-medium">
                        <div>
                          {feature.name}
                          {feature.description && (
                            <div className="text-xs text-muted-foreground">
                              {feature.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {plans.map((plan) => (
                        <TableCell key={`${plan.id}-${feature.id}`} className="text-center">
                          {isFeatureEnabled(plan.id, feature.id) ? (
                            <Check className="mx-auto h-4 w-4 text-green-500" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Payment Provider Options */}
        {user && currentPlan && currentPlan.name !== "Enterprise" && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Upgrade Your Plan</h3>
            <PaymentProviderButtons 
              currentPlan={currentPlan.name === "Free" ? "Pro" : "Enterprise"}
              planPrice={currentPlan.name === "Free" ? 29 : 99}
              planId={currentPlan.name === "Free" ? 2 : 3}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-4">
          {!user ? (
            <Button onClick={() => navigate("/auth")}>Sign Up Now</Button>
          ) : currentPlan ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => navigate("/subscriptions")}>
                    Manage Subscription
                    {subscriptionOverride?.proRatedAmount && (
                      <span className="ml-2 text-xs">
                        (Pro-rated adjustment: ${subscriptionOverride.proRatedAmount})
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View detailed subscription management and payment options</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={() => navigate("/subscriptions")}>Choose a Plan</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}