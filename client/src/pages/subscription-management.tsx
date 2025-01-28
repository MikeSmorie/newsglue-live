import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Calendar, CreditCard, Clock, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SubscriptionComparison } from "@/components/subscription-comparison";

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
}

interface Subscription {
  id: number;
  planId: number;
  userId: number;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface BillingHistory {
  id: number;
  amount: number;
  status: string;
  created: string;
  periodStart: string;
  periodEnd: string;
  description: string;
}

export default function SubscriptionManagement() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current subscription details
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription/current"],
    enabled: !!user,
  });

  // Fetch current plan details
  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
  });

  // Fetch billing history
  const { data: billingHistory = [] } = useQuery<BillingHistory[]>({
    queryKey: ["/api/subscription/billing-history"],
    enabled: !!user,
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to cancel subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the current billing period.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
      });
    },
  });

  // Resume subscription mutation
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/subscription/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to resume subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Resumed",
        description: "Your subscription will continue as normal.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume subscription",
      });
    },
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="container py-10 space-y-8">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Manage your subscription and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Current Plan</div>
                  <div className="text-lg font-semibold">{currentPlan?.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-lg font-semibold capitalize">{subscription.status}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Billing Period</div>
                  <div className="text-lg font-semibold">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Next Payment</div>
                  <div className="text-lg font-semibold">
                    ${currentPlan?.price} on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md">
                  <AlertTriangle className="h-5 w-5" />
                  <div className="text-sm">
                    Your subscription will be cancelled on{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resumeSubscriptionMutation.mutate()}
                    disabled={resumeSubscriptionMutation.isPending}
                  >
                    Resume Subscription
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Subscription Actions</h4>
                  <p className="text-sm text-muted-foreground">
                    Update or cancel your subscription at any time
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {!subscription.cancelAtPeriodEnd && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel Subscription</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Subscription</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel your subscription? You'll continue to have
                            access until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => cancelSubscriptionMutation.mutate()}
                            disabled={cancelSubscriptionMutation.isPending}
                          >
                            Yes, Cancel Subscription
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button onClick={() => navigate("/subscriptions")}>
                    Change Plan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <h3 className="text-lg font-medium">No Active Subscription</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose a plan to get started</p>
              <Button onClick={() => navigate("/subscriptions")} className="mt-4">
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{new Date(invoice.created).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>${invoice.amount}</TableCell>
                    <TableCell className="capitalize">{invoice.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <SubscriptionComparison />
    </div>
  );
}
