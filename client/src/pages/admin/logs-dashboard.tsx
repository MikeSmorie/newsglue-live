import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info, AlertOctagon, Search, Trash2 } from "lucide-react";

interface ErrorLog {
  id: number;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  source: string;
  stackTrace?: string;
  resolved: boolean;
}

export default function LogsDashboard() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Set up automatic refresh every 5 seconds
  const { data: logs = [] } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/logs", levelFilter, search],
    refetchInterval: 5000,
    enabled: !!user && user.role === "admin",
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/logs/clear", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to clear logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      toast({
        title: "Logs cleared",
        description: "All logs have been successfully cleared.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleClearLogs = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all logs?")) {
      clearLogsMutation.mutate();
    }
  }, [clearLogsMutation]);

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const filteredLogs = logs
    .filter((log) => levelFilter === "all" || log.level === levelFilter)
    .filter(
      (log) =>
        search === "" ||
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        log.source.toLowerCase().includes(search.toLowerCase())
    );

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertOctagon className="h-4 w-4 text-destructive" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "INFO":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Logs</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              disabled={clearLogsMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={levelFilter}
              onValueChange={setLevelFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[600px] rounded-md border">
            <div className="space-y-4 p-4">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No logs found
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <Card key={log.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getLevelIcon(log.level)}
                          <Badge
                            variant={
                              log.level === "ERROR"
                                ? "destructive"
                                : log.level === "WARNING"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {log.level}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <Badge variant="outline">{log.source}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{log.message}</p>
                      {log.stackTrace && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded-md overflow-x-auto">
                          {log.stackTrace}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
