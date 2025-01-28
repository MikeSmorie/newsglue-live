import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Lock, Check, X, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch all features and user's subscription info
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

  // Handle locked feature click
  const handleLockedFeatureClick = (feature: Feature) => {
    toast({
      title: "Feature Locked",
      description: `This feature requires the ${feature.requiredPlan || currentPlan?.name || 'higher'} plan. Upgrade to access.`,
      variant: "destructive",
    });
  };

  return (
    <div className="container py-10 space-y-8">
      {/* Subscription Level Banner */}
      <Card className="bg-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Subscription</CardTitle>
              <CardDescription>
                Current Plan: <span className="font-bold">{currentPlan?.name || "No active plan"}</span>
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">
                  Manage Subscription
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upgrade Your Plan</DialogTitle>
                  <DialogDescription>
                    Choose a plan that best suits your needs and unlock more features.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <p>
                    Your current plan: <strong>{currentPlan?.name || "No Plan"}</strong>
                  </p>
                  <Button
                    onClick={() => window.location.href = "/subscriptions"}
                    variant="default"
                  >
                    View Available Plans
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Features Grid */}
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
                          onClick={() => window.location.href = "/subscriptions"}
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