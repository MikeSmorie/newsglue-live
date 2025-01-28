import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useAdmin } from "@/contexts/admin-context";
import { Activity, Cpu, Database, Shield, Puzzle, Users } from "lucide-react";
import { useLocation } from "wouter";
import { SelectActivityLog } from "@db/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HealthStatus {
  status: string;
  timestamp: string;
  components: {
    server: {
      status: string;
      uptime: number;
      memory: NodeJS.MemoryUsage;
      environment: string;
    };
    database: {
      status: string;
      tables: {
        users: { count: number };
        activityLogs: { count: number };
        errorLogs: { count: number };
      };
    };
    subscriptions: {
      status: string;
      stats: {
        totalSubscriptions: number;
        activeSubscriptions: number;
        planDistribution: {
          [key: string]: number;
        };
      };
    };
    auth: {
      status: string;
      provider: string;
    };
    cors: {
      status: string;
      origin: string;
    };
    logging: {
      status: string;
      providers: string[];
    };
    plugins: {
      status: string;
      loaded: Array<{
        name: string;
        status: string;
        loadedAt?: string;
      }>;
    };
  };
  version: string;
}

export default function AdminDashboard() {
  const { user } = useUser();
  const { godMode } = useAdmin();
  const [, navigate] = useLocation();

  // Fetch health status
  const { data: healthStatus, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ["/api/health/detailed"],
  });

  // Fetch activity logs
  const { data: activityLogs, isLoading: logsLoading } = useQuery<SelectActivityLog[]>({
    queryKey: ["/api/admin/activity-logs"],
  });

  // Redirect non-admin users
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  if (healthLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Add navigation handler
  const handleNavigateToSubscriptionManager = () => {
    navigate("/admin/subscription-manager");
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default"
                  onClick={handleNavigateToSubscriptionManager}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Subscription Manager
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Manage subscription plans, features, and user access levels</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">God Mode:</span>
            <span className={`font-bold ${godMode ? "text-destructive" : "text-muted-foreground"}`}>
              {godMode ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>
      </div>

      {healthStatus && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server Status</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.components.server.status}</div>
              <p className="text-xs text-muted-foreground">
                Uptime: {Math.floor(healthStatus.components.server.uptime / 60)} minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.components.database.status}</div>
              <p className="text-xs text-muted-foreground">
                Users: {healthStatus.components.database.tables.users.count}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Authentication</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.components.auth.status}</div>
              <p className="text-xs text-muted-foreground">
                Provider: {healthStatus.components.auth.provider}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthStatus.components.database.tables.activityLogs.count}
              </div>
              <p className="text-xs text-muted-foreground">Total Activities Logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plugins</CardTitle>
              <Puzzle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.components.plugins.loaded.length}</div>
              <p className="text-xs text-muted-foreground">Active Plugins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthStatus.components.subscriptions?.stats.activeSubscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Distribution */}
      {healthStatus?.components.subscriptions?.stats.planDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Active Users</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(healthStatus.components.subscriptions.stats.planDistribution).map(([plan, count]) => {
                  const percentage = ((count / healthStatus.components.subscriptions.stats.totalSubscriptions) * 100).toFixed(1);
                  return (
                    <TableRow key={plan}>
                      <TableCell className="font-medium">{plan}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {healthStatus?.components.plugins.loaded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loaded Plugins</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Loaded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthStatus.components.plugins.loaded.map((plugin) => (
                  <TableRow key={plugin.name}>
                    <TableCell>{plugin.name}</TableCell>
                    <TableCell>{plugin.status}</TableCell>
                    <TableCell>
                      {plugin.loadedAt ? new Date(plugin.loadedAt).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activityLogs && activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{new Date(log.timestamp!).toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}