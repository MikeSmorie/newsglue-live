import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
import { 
  Users, 
  CreditCard, 
  Star,
  Zap,
  Crown,
  Shield,
  Wallet
} from "lucide-react";

interface UserSubscription {
  id: number;
  username: string;
  role: string;
  subscriptionPlan: string;
  walletAddress?: string;
  lastPaymentStatus?: string;
  lastPaymentDate?: string;
  email?: string;
}

function PlanIcon({ plan }: { plan: string }) {
  switch (plan) {
    case "free":
      return <Star className="h-4 w-4 text-blue-500" />;
    case "pro":
      return <Zap className="h-4 w-4 text-purple-500" />;
    case "enterprise":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    default:
      return <Shield className="h-4 w-4 text-gray-500" />;
  }
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case "supergod":
      return <Crown className="h-4 w-4 text-red-500" />;
    case "admin":
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return <Users className="h-4 w-4 text-green-500" />;
  }
}

function getRoleVariant(role: string) {
  switch (role) {
    case "supergod":
      return "destructive" as const;
    case "admin":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getPlanVariant(plan: string) {
  switch (plan) {
    case "enterprise":
      return "default" as const;
    case "pro":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getPaymentStatusVariant(status?: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function AdminSubscriptionManagement() {
  const { user } = useUser();

  // Fetch all user subscriptions for admin view
  const { data: subscriptions = [], isLoading } = useQuery<UserSubscription[]>({
    queryKey: ["/api/admin/subscriptions"],
    enabled: !!user && (user.role === "admin" || user.role === "supergod"),
  });

  if (!user || (user.role !== "admin" && user.role !== "supergod")) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600 dark:text-gray-400">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const stats = {
    totalUsers: subscriptions.length,
    freeUsers: subscriptions.filter(s => s.subscriptionPlan === "free").length,
    proUsers: subscriptions.filter(s => s.subscriptionPlan === "pro").length,
    enterpriseUsers: subscriptions.filter(s => s.subscriptionPlan === "enterprise").length,
    usersWithWallets: subscriptions.filter(s => s.walletAddress).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor user subscriptions, payment status, and wallet addresses
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Free Plan</CardTitle>
            <Star className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.freeUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Pro Plan</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.proUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Enterprise</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.enterpriseUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">With Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.usersWithWallets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">User Subscriptions</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Read-only view of all user subscription data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading subscriptions...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-gray-900 dark:text-white">User</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Role</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Plan</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Wallet</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Last Payment</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id} className="border-gray-200 dark:border-gray-700">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{subscription.username}</p>
                        {subscription.email && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{subscription.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(subscription.role)} className="flex items-center gap-1 w-fit">
                        <RoleIcon role={subscription.role} />
                        {subscription.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanVariant(subscription.subscriptionPlan)} className="flex items-center gap-1 w-fit">
                        <PlanIcon plan={subscription.subscriptionPlan} />
                        {subscription.subscriptionPlan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {subscription.walletAddress ? (
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-500" />
                          <code className="text-xs text-gray-700 dark:text-gray-300">
                            {subscription.walletAddress.slice(0, 6)}...{subscription.walletAddress.slice(-4)}
                          </code>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.lastPaymentDate ? (
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {new Date(subscription.lastPaymentDate).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No payments</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.lastPaymentStatus ? (
                        <Badge variant={getPaymentStatusVariant(subscription.lastPaymentStatus)}>
                          {subscription.lastPaymentStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline">N/A</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}