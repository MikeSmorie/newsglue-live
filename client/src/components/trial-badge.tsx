import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Clock, Unlock } from "lucide-react";

interface User {
  id: number;
  username: string;
  subscriptionPlan: string;
  trialActive: boolean;
  trialStartDate: string;
  trialExpiresAt: string;
}

export function TrialBadge() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    }
  });

  const queryClient = useQueryClient();

  // Auto-update trial status if expired
  const updateTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/trial/check-status", {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Failed to update trial status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  if (isLoading || !user) {
    return null;
  }

  // Check if trial is active and not expired
  const now = new Date();
  const trialExpiry = new Date(user.trialExpiresAt);
  const isTrialActive = user.trialActive && trialExpiry > now;
  
  if (!isTrialActive) {
    // Auto-update trial status if expired
    if (user.trialActive && trialExpiry <= now) {
      updateTrialMutation.mutate();
    }
    return null;
  }

  // Calculate days remaining
  const timeDiff = trialExpiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return (
    <Badge variant="secondary" className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border-orange-200">
      <Unlock className="h-3 w-3" />
      <span>🔓 Trial Access – {daysRemaining} days remaining</span>
      <Clock className="h-3 w-3" />
    </Badge>
  );
}