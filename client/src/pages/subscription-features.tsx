import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Lock, Check, X, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface Feature {
  id: number;
  name: string;
  category: string;
  description: string | null;
  requiredPlan?: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
}

export default function SubscriptionFeatures() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  const { data: userFeatures = [] } = useQuery<number[]>({
    queryKey: ["/api/features/user"],
    enabled: !!user,
  });

  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
  });

  const handleLockedFeatureClick = (feature: Feature) => {
    toast({
      title: "Feature Locked",
      description: `This feature requires the ${feature.requiredPlan || currentPlan?.name || 'higher'} plan. Upgrade to access.`,
      variant: "destructive",
    });
  };

  return (
    <div className="container py-10 space-y-8">
      <Card className="bg-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Subscription</CardTitle>
              <CardDescription>
                Current Plan: <span className="font-bold">{currentPlan?.name || "No active plan"}</span>
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to App Central
              </Button>
              <Button variant="default" onClick={() => navigate("/subscription/plans")}>
                Manage Subscription
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const isAccessible = userFeatures.includes(feature.id);

          return (
            <Card
              key={feature.id}
              className={`relative ${isAccessible ? 'hover:shadow-md' : 'opacity-75'}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{feature.name}</span>
                  {isAccessible ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <span className="text-sm">Available</span>
                      <Check className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">Locked</span>
                      <Lock className="h-5 w-5" />
                    </div>
                  )}
                </CardTitle>
                <CardDescription>{feature.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {feature.description || "No description available"}
                </p>
                {!isAccessible && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleLockedFeatureClick(feature)}
                      >
                        Upgrade to Access
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Feature Locked</DialogTitle>
                        <DialogDescription>
                          This feature requires a higher subscription level to access.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>
                          Required Plan: <strong>{feature.requiredPlan || "Higher tier"}</strong>
                        </p>
                        <p>
                          Your Current Plan: <strong>{currentPlan?.name || "No Plan"}</strong>
                        </p>
                        <Button
                          onClick={() => navigate("/subscriptions")}
                          variant="default"
                          className="w-full"
                        >
                          View Available Plans
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}