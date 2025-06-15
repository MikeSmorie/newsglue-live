import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/use-user";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Wallet, 
  Check, 
  Star,
  Shield,
  Zap,
  Crown,
  AlertCircle
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

interface Payment {
  id: number;
  method: string;
  status: string;
  timestamp: string;
  reference: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for getting started",
    features: [
      "Access to 3 modules",
      "Basic features",
      "Community support",
      "1 GB storage"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    description: "Best for growing teams",
    features: [
      "Access to all 10 modules",
      "Advanced features",
      "Priority support",
      "10 GB storage",
      "API access",
      "Custom integrations"
    ],
    recommended: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Dedicated support",
      "Advanced analytics",
      "Custom branding",
      "SLA guarantee",
      "On-premise deployment"
    ]
  }
];

function PlanIcon({ planId }: { planId: string }) {
  switch (planId) {
    case "free":
      return <Star className="h-5 w-5 text-blue-500" />;
    case "pro":
      return <Zap className="h-5 w-5 text-purple-500" />;
    case "enterprise":
      return <Crown className="h-5 w-5 text-yellow-500" />;
    default:
      return <Shield className="h-5 w-5 text-gray-500" />;
  }
}

export default function SubscriptionManagement() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnectingPaypal, setIsConnectingPaypal] = useState(false);

  const currentPlan = user?.subscriptionPlan || "free";
  const isProduction = import.meta.env.PROD;
  const isSandbox = !isProduction;

  // Fetch user's payment history
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  // Mutation for changing subscription plan
  const changeSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch("/api/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error("Failed to change subscription");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upgrade Request Submitted",
        description: "Your upgrade request has been submitted for processing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Mutation for saving wallet address
  const saveWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch("/api/user/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!response.ok) throw new Error("Failed to save wallet address");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wallet Address Saved",
        description: "Your stablecoin wallet address has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handlePlanChange = (planId: string) => {
    if (planId === currentPlan) return;
    changeSubscriptionMutation.mutate(planId);
  };

  const handleConnectPaypal = async () => {
    setIsConnectingPaypal(true);
    // Mock PayPal connection
    setTimeout(() => {
      setIsConnectingPaypal(false);
      toast({
        title: "PayPal Connected",
        description: "Your PayPal account has been connected successfully.",
      });
    }, 2000);
  };

  const handleSaveWallet = () => {
    if (!walletAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid wallet address.",
      });
      return;
    }
    saveWalletMutation.mutate(walletAddress);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Current Plan Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your subscription plan and payment methods
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <PlanIcon planId={currentPlan} />
          Current: {plans.find(p => p.id === currentPlan)?.name || "Free"}
        </Badge>
      </div>

      {/* Sandbox Mode Notice */}
      {isSandbox && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">💡 Payments are mocked in sandbox mode</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Subscription Plans */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
          Choose Your Plan
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isUpgrade = plans.findIndex(p => p.id === currentPlan) < plans.findIndex(p => p.id === plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${
                  isCurrentPlan 
                    ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800" 
                    : "border-gray-200 dark:border-gray-700"
                } ${plan.recommended ? "border-purple-500 dark:border-purple-400" : ""} bg-white dark:bg-gray-800`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-500 text-white">Recommended</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-blue-500 text-white">Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    <PlanIcon planId={plan.id} />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : "default"}
                    disabled={isCurrentPlan || changeSubscriptionMutation.isPending}
                    onClick={() => handlePlanChange(plan.id)}
                  >
                    {isCurrentPlan 
                      ? "Current Plan" 
                      : isUpgrade 
                        ? `Upgrade to ${plan.name}` 
                        : `Select ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PayPal Connection */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <CreditCard className="h-5 w-5" />
              PayPal Payment
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Connect your PayPal account for easy payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnectPaypal}
              disabled={isConnectingPaypal}
              className="w-full"
              variant="outline"
            >
              {isConnectingPaypal ? "Connecting..." : "Connect PayPal"}
            </Button>
          </CardContent>
        </Card>

        {/* Stablecoin Wallet */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Wallet className="h-5 w-5" />
              Stablecoin Wallet
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Add your wallet address for stablecoin payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-gray-900 dark:text-white">
                Wallet Address
              </Label>
              <Input
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x1234567890abcdef..."
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <Button
              onClick={handleSaveWallet}
              disabled={saveWalletMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {saveWalletMutation.isPending ? "Saving..." : "Save Wallet Address"}
            </Button>
            {user.walletAddress && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current: {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Payment History</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your recent payment transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                      {payment.method === "paypal" && <CreditCard className="h-4 w-4" />}
                      {payment.method === "stablecoin" && <Wallet className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} Payment
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        payment.status === "completed" ? "default" :
                        payment.status === "pending" ? "secondary" :
                        "destructive"
                      }
                    >
                      {payment.status}
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Ref: {payment.reference}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}