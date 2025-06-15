import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield,
  Database,
  FileText,
  Download,
  Clock,
  User,
  Settings,
  AlertTriangle,
  Eye,
  Lock
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  prompt: string;
  userRole: string;
  sessionId: string;
  executionTime: number;
  status: "completed" | "failed" | "pending";
  metadata: {
    ipAddress: string;
    userAgent: string;
    route: string;
  };
}

export default function AuditModule() {
  const { user } = useUser();
  const [isExporting, setIsExporting] = useState(false);

  // Access control - only admin/supergod can view
  if (!user || (user.role !== "admin" && user.role !== "supergod")) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Lock className="h-16 w-16 mx-auto text-gray-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Restricted</h2>
            <p className="text-gray-600 dark:text-gray-400">Admin or Supergod privileges required</p>
          </div>
        </div>
      </div>
    );
  }

  // Mock audit metadata
  const auditMetadata = {
    schemaVersion: "v1.2.3",
    lastPromptExecuted: "Omega-10 Audit Module Implementation",
    sessionUserRole: user.role,
    applicationMode: "sandbox",
    totalUsers: 3,
    activeConnections: 1,
    databaseStatus: "healthy",
    lastBackup: "2024-01-15T10:30:00Z",
    systemUptime: "72h 15m"
  };

  // Mock audit logs - last 20 executed prompts
  const auditLogs: AuditLog[] = [
    {
      id: "audit-001",
      timestamp: "2024-01-15T14:45:23Z",
      prompt: "Omega-10 Audit Module Implementation",
      userRole: "supergod",
      sessionId: "sess_7x9k2m4n",
      executionTime: 2340,
      status: "completed",
      metadata: {
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (compatible)",
        route: "/api/audit/create"
      }
    },
    {
      id: "audit-002",
      timestamp: "2024-01-15T14:30:15Z",
      prompt: "Module UI Correction - Clarify Silo Purpose",
      userRole: "admin",
      sessionId: "sess_5a8b3c1d",
      executionTime: 1850,
      status: "completed",
      metadata: {
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0 (compatible)",
        route: "/api/modules/update"
      }
    },
    {
      id: "audit-003",
      timestamp: "2024-01-15T14:15:42Z",
      prompt: "Two-Factor Authentication Scaffold",
      userRole: "admin",
      sessionId: "sess_9f2e1h7g",
      executionTime: 4120,
      status: "completed",
      metadata: {
        ipAddress: "192.168.1.102",
        userAgent: "Mozilla/5.0 (compatible)",
        route: "/api/auth/2fa"
      }
    },
    {
      id: "audit-004",
      timestamp: "2024-01-15T13:58:30Z",
      prompt: "Subscription Management Interface Polish",
      userRole: "admin",
      sessionId: "sess_3k8m5p2q",
      executionTime: 2890,
      status: "completed",
      metadata: {
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (compatible)",
        route: "/api/subscriptions/manage"
      }
    },
    {
      id: "audit-005",
      timestamp: "2024-01-15T13:45:18Z",
      prompt: "Database Schema Synchronization",
      userRole: "supergod",
      sessionId: "sess_1x4y7z9a",
      executionTime: 1560,
      status: "failed",
      metadata: {
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (compatible)",
        route: "/api/database/sync"
      }
    }
  ];

  const handleExportJSON = () => {
    setIsExporting(true);
    const exportData = {
      metadata: auditMetadata,
      logs: auditLogs,
      exportTimestamp: new Date().toISOString(),
      exportedBy: user.username
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omega-audit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    // PDF export placeholder - would integrate with PDF library
    alert("PDF export functionality will be implemented with backend integration");
    setTimeout(() => setIsExporting(false), 1000);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Omega-10 Audit Module
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            System Audit – Developer/Internal Use Only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Restricted Access
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Live Monitoring
          </Badge>
        </div>
      </div>

      {/* System Metadata */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Schema Version</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{auditMetadata.schemaVersion}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Current database schema</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Session Role</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{auditMetadata.sessionUserRole}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Current user privileges</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">App Mode</CardTitle>
            <Settings className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{auditMetadata.applicationMode}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Runtime environment</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">System Uptime</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{auditMetadata.systemUptime}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Continuous operation</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Prompt Executed */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileText className="h-5 w-5" />
            Last Prompt Executed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <code className="text-sm text-gray-700 dark:text-gray-300">
              {auditMetadata.lastPromptExecuted}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Export Controls */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Download className="h-5 w-5" />
            Export Audit Data
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Download complete audit logs and system metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button 
            onClick={handleExportJSON}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export JSON"}
          </Button>
          <Button 
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </CardContent>
      </Card>

      {/* Audit Log Viewer */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Shield className="h-5 w-5" />
            Recent Audit Logs (Last 20 Prompts)
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Scrollable JSON payload of executed system prompts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        #{index + 1}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
{JSON.stringify({
  id: log.id,
  prompt: log.prompt,
  userRole: log.userRole,
  sessionId: log.sessionId,
  executionTime: `${log.executionTime}ms`,
  status: log.status,
  metadata: log.metadata
}, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}