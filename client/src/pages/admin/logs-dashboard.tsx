import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  RefreshCw, 
  Filter,
  Download,
  Eye,
  User,
  Clock,
  Activity
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { format } from "date-fns";

interface LogEntry {
  id: number;
  timestamp: string;
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
  userRole: string;
  endpoint: string | null;
  eventType: string;
  severity: "info" | "warning" | "error";
  message: string;
  stackTrace: string | null;
  metadata: any;
}

interface LogStats {
  timeRange: string;
  severityCounts: Record<string, number>;
  eventTypeCounts: Record<string, number>;
}

const severityIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />
};

const severityColors = {
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  error: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
};

export default function LogsDashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    severity: "",
    eventType: "",
    userId: "",
    hours: "24",
    limit: "100"
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    }
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin-logs-stats", filters.hours],
    queryFn: async () => {
      const response = await fetch(`/api/admin/logs/stats?hours=${filters.hours}`);
      if (!response.ok) throw new Error("Failed to fetch log statistics");
      return response.json();
    }
  });

  const toggleLogExpansion = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/admin/logs/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omega-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Logs exported",
        description: "Log data has been downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export log data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and errors</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsData.severityCounts.error || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last {statsData.timeRange}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsData.severityCounts.warning || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last {statsData.timeRange}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(statsData.severityCounts).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Last {statsData.timeRange}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select value={filters.severity} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={filters.eventType} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, eventType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All events</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="failed_request">Failed Request</SelectItem>
                  <SelectItem value="subscription_change">Subscription Change</SelectItem>
                  <SelectItem value="payment_attempt">Payment Attempt</SelectItem>
                  <SelectItem value="error_boundary">Error Boundary</SelectItem>
                  <SelectItem value="api_error">API Error</SelectItem>
                  <SelectItem value="user_action">User Action</SelectItem>
                  <SelectItem value="system_event">System Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="hours">Time Range</Label>
              <Select value={filters.hours} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, hours: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last hour</SelectItem>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="168">Last week</SelectItem>
                  <SelectItem value="720">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="limit">Limit</Label>
              <Select value={filters.limit} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, limit: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="500">500 entries</SelectItem>
                  <SelectItem value="1000">1000 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Log Entries
            {logsData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({logsData.logs.length} entries)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : logsData?.logs.length > 0 ? (
            <div className="space-y-2">
              {logsData.logs.map((log: LogEntry) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {severityIcons[log.severity]}
                      <Badge className={severityColors[log.severity]}>
                        {log.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{log.eventType}</Badge>
                      {log.user && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{log.user.username} ({log.user.role})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm">{log.message}</p>
                    {log.endpoint && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Endpoint: {log.endpoint}
                      </p>
                    )}
                  </div>
                  
                  {expandedLogs.has(log.id) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {log.stackTrace && (
                        <div>
                          <Label className="text-xs font-semibold">Stack Trace</Label>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                            {log.stackTrace}
                          </pre>
                        </div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <Label className="text-xs font-semibold">Metadata</Label>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No logs found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}