import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, HelpCircle } from "lucide-react";

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
  subscription?: {
    id: number;
    planId: number;
    status: string;
  };
}

export default function SubscriptionManager() {
  const [newFeature, setNewFeature] = useState({ name: "", category: "", description: "" });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkPlanId, setBulkPlanId] = useState<number | null>(null);
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

  // Fetch users with their subscription info
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/with-subscriptions"],
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

  // Mutation for updating user subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, planId }: { userId: number; planId: number }) => {
      const response = await fetch("/api/subscription/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });
      if (!response.ok) throw new Error("Failed to update subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/with-subscriptions"] });
      toast({
        title: "Subscription updated",
        description: "The user's subscription has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update subscription",
      });
    },
  });

  // Mutation for bulk updating subscriptions
  const bulkUpdateSubscriptionsMutation = useMutation({
    mutationFn: async ({ userIds, planId }: { userIds: number[]; planId: number }) => {
      const response = await fetch("/api/subscription/bulk-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, planId }),
      });
      if (!response.ok) throw new Error("Failed to update subscriptions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/with-subscriptions"] });
      setSelectedUsers([]);
      setBulkPlanId(null);
      toast({
        title: "Subscriptions updated",
        description: "The selected users' subscriptions have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update subscriptions",
      });
    },
  });

  // Rest of the existing mutations...
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

  const handleBulkUpdate = () => {
    if (!bulkPlanId || selectedUsers.length === 0) return;
    bulkUpdateSubscriptionsMutation.mutate({
      userIds: selectedUsers,
      planId: bulkPlanId,
    });
  };

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Subscription Feature Manager</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p>Manage subscription plans, features, and user access levels all in one place. 
                     Use the tabs below to switch between different management views.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Manage features, subscription plans, and user overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="features">
            <TabsList className="mb-4">
              <TabsTrigger value="features">Feature Matrix</TabsTrigger>
              <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
              <TabsTrigger value="user-overrides">Feature Overrides</TabsTrigger>
              <TabsTrigger value="add-feature">Add New Feature</TabsTrigger>
            </TabsList>

            {/* Feature Matrix Tab */}
            <TabsContent value="features">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Feature Matrix</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p>Use the toggles to enable or disable features for each subscription plan. 
                         Changes take effect immediately for all users on that plan.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Feature</TableHead>
                      <TableHead className="w-[120px]">Category</TableHead>
                      {plans.map((plan) => (
                        <TableHead key={plan.id} className="text-center">
                          {plan.name}
                          <div className="text-xs text-muted-foreground">
                            ${plan.price}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>{feature.category}</TableCell>
                        {plans.map((plan) => (
                          <TableCell key={`${plan.id}-${feature.id}`} className="text-center">
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
              </div>
            </TabsContent>

            {/* User Subscriptions Tab */}
            <TabsContent value="subscriptions">
              <div className="space-y-4">
                {/* Bulk Update Section */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-medium">Bulk Update Subscriptions</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p>Select multiple users and update their subscription plans all at once. 
                               This override will persist even after payment gateway updates.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <Select
                        value={bulkPlanId?.toString() || ""}
                        onValueChange={(value) => setBulkPlanId(parseInt(value))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select plan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleBulkUpdate}
                        disabled={!bulkPlanId || selectedUsers.length === 0}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Update Selected Users ({selectedUsers.length})
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Users Table with Help Icon */}
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">Individual Subscription Management</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px]">
                        <p>Manage individual user subscriptions here. Changes override the payment gateway 
                           assignment and persist until manually changed again.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]">
                          <Checkbox
                            checked={selectedUsers.length === users.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(users.map((u) => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Current Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            {plans.find((p) => p.id === user.subscription?.planId)?.name || "No Plan"}
                          </TableCell>
                          <TableCell>
                            {user.subscription?.status || "Inactive"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.subscription?.planId?.toString() || ""}
                              onValueChange={(value) => {
                                updateSubscriptionMutation.mutate({
                                  userId: user.id,
                                  planId: parseInt(value),
                                });
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Change plan..." />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id.toString()}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* User Overrides Tab */}
            <TabsContent value="user-overrides">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">Feature Overrides</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px]">
                        <p>Grant or revoke specific features for individual users, regardless of their 
                           subscription plan. These overrides take precedence over plan settings.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="user">Select User</Label>
                    <select
                      id="user"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedUser?.id || ""}
                      onChange={(e) => {
                        const user = users.find((u) => u.id === parseInt(e.target.value));
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
            </TabsContent>

            {/* Add New Feature Tab */}
            <TabsContent value="add-feature">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Add New Feature</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p>Create new features that can be assigned to subscription plans. 
                         After adding a feature, assign it to plans using the Feature Matrix tab.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addFeatureMutation.mutate(newFeature);
                }}
                className="space-y-4"
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}