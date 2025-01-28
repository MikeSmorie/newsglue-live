import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Lock, Check, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/admin-context";
import { SubscriptionComparison } from "@/components/subscription-comparison";

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

export default function UserDashboard() {
  const { user } = useUser();
  const { godMode } = useAdmin();
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
              <CardTitle>Your Dashboard</CardTitle>
              <CardDescription className="mt-2">
                Current Plan: <span className="font-bold text-primary">{currentPlan?.name || "No active plan"}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = "/subscriptions"}>
                Manage Subscription
              </Button>
              {godMode && (
                <Button variant="secondary" onClick={() => window.location.href = "/admin"}>
                  Return to Admin View
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Features Grid */}
      <div className="grid gap-8">
        {/* Available Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Available Features
            </CardTitle>
            <CardDescription>Features included in your current subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.filter(feature => userFeatures.includes(feature.id)).map((feature) => (
                <Card key={feature.id} className="bg-background hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                    <CardDescription>{feature.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description || "No description available"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Locked Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Locked Features
            </CardTitle>
            <CardDescription>Upgrade your subscription to access these features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.filter(feature => !userFeatures.includes(feature.id)).map((feature) => (
                <Card 
                  key={feature.id} 
                  className="bg-muted/50 hover:bg-muted/75 cursor-pointer transition-colors"
                  onClick={handleLockedFeatureClick}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {feature.name}
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>{feature.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {feature.description || "No description available"}
                    </p>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = "/subscriptions";
                      }}
                    >
                      Upgrade to Access
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <SubscriptionComparison />
      </div>
    </div>
  );
}