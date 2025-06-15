import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { AuditTable } from "@/components/admin/AuditTable";
import { AuditLogEntry } from "@/lib/types";
import { Shield, Lock, Download } from "lucide-react";

export default function AuditPage() {
  const { user } = useUser();

  const handleExportLogs = async () => {
    try {
      const response = await fetch("/api/admin/audit-logs/pdf", {
        method: "GET",
        credentials: "include"
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "omega-audit-logs.txt";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to export audit logs");
      }
    } catch (error) {
      console.error("Error exporting audit logs:", error);
    }
  };

  // Access control - only supergod can view audit logs
  if (!user || user.role !== "supergod") {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Lock className="h-16 w-16 mx-auto text-gray-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Restricted</h2>
            <p className="text-gray-600 dark:text-gray-400">Supergod privileges required for audit log access</p>
          </div>
        </div>
      </div>
    );
  }

  const { data: logs = [], isLoading, error } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/audit-logs"],
    enabled: !!user && user.role === "supergod",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600 dark:text-gray-400">Loading audit logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-red-600 dark:text-red-400">Error loading audit logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Omega Audit Logs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          System-wide audit trail for security and compliance monitoring
        </p>
      </div>

      {/* Audit Logs Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Shield className="h-5 w-5" />
                System Audit Trail
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Complete log of system actions and user activities (Last 100 entries)
              </CardDescription>
            </div>
            <Button 
              onClick={handleExportLogs}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Logs to PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AuditTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}