import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Lock, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Feature {
  id: number;
  name: string;
  category: string;
  description: string | null;
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
  const handleLockedFeatureClick = () => {
    toast({
      title: "Feature Locked",
      description: `This feature is only available for ${currentPlan?.name || 'higher'} subscribers. Upgrade your plan to access.`,
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
            <Button variant="outline" onClick={() => window.location.href = "/subscription/plans"}>
              Manage Subscription
            </Button>
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  {feature.name}
                  {isAccessible ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>{feature.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {feature.description || "No description available"}
                </p>
                {!isAccessible && (
                  <Button 
                    variant="secondary" 
                    onClick={handleLockedFeatureClick}
                    className="w-full"
                  >
                    Upgrade to Access
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
