import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, Calendar } from "lucide-react";

interface TokenBalance {
  balance: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  hasTokens: boolean;
}

export function TokenBalanceDisplay() {
  const { data: tokenData, isLoading, error } = useQuery<TokenBalance>({
    queryKey: ["/api/tokens/balance"],
    queryFn: async () => {
      const response = await fetch("/api/tokens/balance", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch token balance");
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Unable to load token balance</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = tokenData?.expiresAt && new Date(tokenData.expiresAt) < new Date();
  const isExpiringSoon = tokenData?.expiresAt && 
    new Date(tokenData.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Token Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{tokenData?.balance || 0}</span>
          <Badge variant={tokenData?.hasTokens ? "default" : "secondary"}>
            {tokenData?.hasTokens ? "Active" : "Empty"}
          </Badge>
        </div>

        {tokenData?.expiresAt && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>Expires: {formatDate(tokenData.expiresAt)}</span>
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            )}
            {isExpiringSoon && !isExpired && (
              <Badge variant="outline" className="text-xs">
                Expiring Soon
              </Badge>
            )}
          </div>
        )}

        {tokenData?.lastUsedAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Last used: {formatDate(tokenData.lastUsedAt)}</span>
          </div>
        )}

        {!tokenData?.hasTokens && (
          <p className="text-sm text-gray-500">
            No tokens available. Contact an administrator for token allocation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}