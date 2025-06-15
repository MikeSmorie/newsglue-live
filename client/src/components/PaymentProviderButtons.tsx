import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, Wallet, DollarSign } from "lucide-react";

interface PaymentProvider {
  id: number;
  name: string;
  isActive: boolean;
  integrationType: string;
  notes?: string;
}

interface PaymentProviderButtonsProps {
  currentPlan: string;
  planPrice?: number;
  planId?: number;
}

export function PaymentProviderButtons({ currentPlan, planPrice = 29, planId = 2 }: PaymentProviderButtonsProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingProvider, setProcessingProvider] = useState<string | null>(null);

  // Fetch available payment providers
  const { data: providers = [], isLoading } = useQuery<PaymentProvider[]>({
    queryKey: ["/api/payments/providers"],
    refetchInterval: 10000,
  });

  // Payment processing mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ provider, amount }: { provider: string; amount: number }) => {
      const response = await fetch(`/api/payments/${provider}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "USD",
          userId: user?.id,
          metadata: {
            planId,
            planName: currentPlan,
            upgradeFrom: user?.subscriptionPlan || "free"
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Payment failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: `Transaction completed with ${data.provider}. Reference: ${data.txReference}`,
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      setProcessingProvider(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.message,
      });
      setProcessingProvider(null);
    },
  });

  const handlePayment = async (providerName: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to process payments",
      });
      return;
    }

    setProcessingProvider(providerName);
    paymentMutation.mutate({ 
      provider: providerName, 
      amount: planPrice 
    });
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'paypal':
        return <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>;
      case 'solana':
        return <Wallet className="h-6 w-6 text-purple-500" />;
      case 'flutterwave':
        return <CreditCard className="h-6 w-6 text-orange-500" />;
      default:
        return <DollarSign className="h-6 w-6 text-gray-500" />;
    }
  };

  const getProviderDescription = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'paypal':
        return "Secure payments with your PayPal account";
      case 'solana':
        return "Pay with USDC on Solana blockchain";
      case 'flutterwave':
        return "Multiple payment options via Flutterwave";
      default:
        return `Pay securely with ${providerName}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading payment options...</span>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <p className="text-muted-foreground">No payment providers available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Upgrade to {currentPlan} plan for ${planPrice}/month
      </div>
      
      {providers.map((provider) => (
        <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getProviderIcon(provider.name)}
            <div>
              <p className="font-medium capitalize">{provider.name}</p>
              <p className="text-sm text-muted-foreground">
                {getProviderDescription(provider.name)}
              </p>
              {provider.notes && (
                <p className="text-xs text-muted-foreground mt-1">{provider.notes}</p>
              )}
            </div>
          </div>
          
          <Button
            onClick={() => handlePayment(provider.name)}
            disabled={processingProvider === provider.name || !provider.isActive}
            className="min-w-[120px]"
          >
            {processingProvider === provider.name ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Pay with ${provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}`
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}