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

  const handleLockedFeatureClick = () => {
    toast({
      title: "Feature Locked",
      description: `This feature is only available for ${currentPlan?.name || 'higher'} subscribers. Upgrade your plan to access.`,
      variant: "destructive",
    });
  };

  return (
    <div className="container py-10 space-y-8">
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

      <SubscriptionComparison />
    </div>
  );
}