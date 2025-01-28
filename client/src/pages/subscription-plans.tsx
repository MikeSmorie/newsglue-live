import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { SubscriptionComparison } from "@/components/subscription-comparison";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features?: string[];
  isPopular?: boolean;
  trialDays?: number;
}

export default function SubscriptionPlans() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch available plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  // Fetch current plan if user is logged in
  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
  });

  // Handle plan selection/upgrade
  const changePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error("Failed to change plan");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Plan Updated",
        description: data.message || "Your subscription has been updated successfully.",
      });
      navigate("/subscription");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update plan",
      });
    },
  });

  if (!user) {
    return (
      <div className="container py-10 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>Please sign in to view and select subscription plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Select the plan that best fits your needs
          </p>
        </div>
        {currentPlan && (
          <Button variant="outline" onClick={() => navigate("/subscription")}>
            Back to Subscription Management
          </Button>
        )}
      </div>

      {/* Plan Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.isPopular ? 'border-primary' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                ${plan.price}/month
                {plan.trialDays && (
                  <span className="text-primary ml-2">
                    ({plan.trialDays} days free trial)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-2">
                {plan.features?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan?.id === plan.id ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant={plan.isPopular ? "default" : "outline"}>
                      {currentPlan ? 'Change Plan' : 'Select Plan'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Plan Change</DialogTitle>
                      <DialogDescription>
                        {currentPlan ? (
                          plan.price > currentPlan.price ? (
                            `You'll be charged the pro-rated difference for upgrading to the ${plan.name} plan.`
                          ) : (
                            `Your plan will be downgraded to ${plan.name} at the end of your current billing period.`
                          )
                        ) : (
                          `You're about to subscribe to the ${plan.name} plan.`
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {plan.trialDays && !currentPlan && (
                        <div className="flex items-center gap-2 p-4 bg-secondary/50 rounded-lg">
                          <Check className="h-5 w-5 text-green-500" />
                          <p className="text-sm">
                            Includes a {plan.trialDays}-day free trial
                          </p>
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => changePlanMutation.mutate(plan.id)}
                        disabled={changePlanMutation.isPending}
                      >
                        Confirm Selection
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Feature Comparison */}
      <SubscriptionComparison />
    </div>
  );
}