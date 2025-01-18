import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useAdmin } from "@/contexts/admin-context";
import { Activity, Cpu, Database, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { SelectActivityLog } from "@db/schema";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">God Mode:</span>
          <span className={`font-bold ${godMode ? "text-destructive" : "text-muted-foreground"}`}>
            {godMode ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      {healthStatus && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </div>
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