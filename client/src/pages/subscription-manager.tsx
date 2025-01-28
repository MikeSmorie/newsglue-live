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

interface User {
  id: number;
  username: string;
}

interface UserFeature {
  userId: number;
  featureId: number;
  enabled: boolean;
}

export default function SubscriptionManager() {
  const [newFeature, setNewFeature] = useState({ name: "", category: "", description: "" });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all subscription plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  // Fetch all features
  const { data: features = [], isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Fetch plan-feature assignments
  const { data: planFeatures = [], isLoading: assignmentsLoading } = useQuery<PlanFeature[]>({
    queryKey: ["/api/features/assignments"],
  });

  // Fetch users for override management
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch user's custom features when a user is selected
  const { data: userFeatures = [], isLoading: userFeaturesLoading } = useQuery<number[]>({
    queryKey: ["/api/features/admin/user-features", selectedUser?.id],
    enabled: !!selectedUser,
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

  // Mutation for overriding user features
  const overrideFeatureMutation = useMutation({
    mutationFn: async ({ userId, featureId, enabled }: { userId: number; featureId: number; enabled: boolean }) => {
      const response = await fetch("/api/features/admin/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, featureId, enabled }),
      });
      if (!response.ok) throw new Error("Failed to override feature");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features/admin/user-features"] });
      toast({
        title: "Override updated",
        description: "The feature override has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update override",
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

  if (plansLoading || featuresLoading || assignmentsLoading || usersLoading || userFeaturesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isFeatureEnabled = (planId: number, featureId: number) => {
    return planFeatures.some(
      (pf) => pf.planId === planId && pf.featureId === featureId && pf.enabled
    );
  };

  const isFeatureOverridden = (featureId: number) => {
    return userFeatures.includes(featureId);
  };

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Feature Manager</CardTitle>
          <CardDescription>
            Manage features available in each subscription plan and user overrides
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

          {/* User Override Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">User Feature Overrides</h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="user">Select User</Label>
                  <select
                    id="user"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedUser?.id || ""}
                    onChange={(e) => {
                      const user = users.find(u => u.id === parseInt(e.target.value));
                      setSelectedUser(user || null);
                    }}
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUser && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Override</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>{feature.name}</TableCell>
                        <TableCell>{feature.category}</TableCell>
                        <TableCell>
                          <Switch
                            checked={isFeatureOverridden(feature.id)}
                            onCheckedChange={(checked) =>
                              overrideFeatureMutation.mutate({
                                userId: selectedUser.id,
                                featureId: feature.id,
                                enabled: checked,
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Feature Assignment Table */}
          <h3 className="text-lg font-medium mb-4">Plan Feature Assignments</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Category</TableHead>
                {plans.map((plan) => (
                  <TableHead key={plan.id}>{plan.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>{feature.name}</TableCell>
                  <TableCell>{feature.category}</TableCell>
                  {plans.map((plan) => (
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