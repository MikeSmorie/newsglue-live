import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

interface Feature {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
}

interface PlanFeature {
  id: number;
  planId: number;
  featureId: number;
  enabled: boolean;
}

export default function SubscriptionManager() {
  const [newFeature, setNewFeature] = useState({ name: "", category: "", description: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
  });

  // Fetch all features
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ["/api/features"],
  });

  // Fetch plan-feature assignments
  const { data: planFeatures, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/features/assignments"],
  });

  // Mutation for toggling features
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ planId, featureId, enabled }: { planId: number; featureId: number; enabled: boolean }) => {
      const response = await fetch("/api/features/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, featureId, enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle feature");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features/assignments"] });
      toast({
        title: "Feature updated",
        description: "The feature has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update feature",
      });
    },
  });

  // Mutation for adding new features
  const addFeatureMutation = useMutation({
    mutationFn: async (feature: typeof newFeature) => {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feature),
      });
      if (!response.ok) throw new Error("Failed to add feature");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setNewFeature({ name: "", category: "", description: "" });
      toast({
        title: "Feature added",
        description: "New feature has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add feature",
      });
    },
  });

  if (plansLoading || featuresLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isFeatureEnabled = (planId: number, featureId: number) => {
    return planFeatures?.some(
      (pf: PlanFeature) => pf.planId === planId && pf.featureId === featureId && pf.enabled
    );
  };

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Feature Manager</CardTitle>
          <CardDescription>
            Manage features available in each subscription plan
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Add New Feature Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addFeatureMutation.mutate(newFeature);
            }}
            className="space-y-4 mb-8"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Feature Name</Label>
                <Input
                  id="name"
                  value={newFeature.name}
                  onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newFeature.category}
                  onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="ml-auto" disabled={addFeatureMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </form>

          {/* Feature Assignment Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Category</TableHead>
                {plans?.map((plan: Plan) => (
                  <TableHead key={plan.id}>{plan.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {features?.map((feature: Feature) => (
                <TableRow key={feature.id}>
                  <TableCell>{feature.name}</TableCell>
                  <TableCell>{feature.category}</TableCell>
                  {plans?.map((plan: Plan) => (
                    <TableCell key={`${plan.id}-${feature.id}`}>
                      <Switch
                        checked={isFeatureEnabled(plan.id, feature.id)}
                        onCheckedChange={(checked) =>
                          toggleFeatureMutation.mutate({
                            planId: plan.id,
                            featureId: feature.id,
                            enabled: checked,
                          })
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
