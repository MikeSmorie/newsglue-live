import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuditLogEntry } from "@/lib/types";

interface AuditTableProps {
  logs: AuditLogEntry[];
}

export function AuditTable({ logs }: AuditTableProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatData = (data: any) => {
    if (!data) return "-";
    return JSON.stringify(data, null, 0);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("login") || action.includes("access")) return "default";
    if (action.includes("change") || action.includes("update")) return "secondary";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("create") || action.includes("enable")) return "default";
    return "outline";
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <ScrollArea className="h-96 w-full">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 dark:border-gray-700">
              <TableHead className="text-gray-900 dark:text-white">Timestamp</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Actor</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Action</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Target</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Data</TableHead>
              <TableHead className="text-gray-900 dark:text-white">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-gray-200 dark:border-gray-700">
                <TableCell className="text-gray-900 dark:text-white font-mono text-sm">
                  {formatTimestamp(log.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-foreground">
                    {log.actor}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white">
                  {log.target || "-"}
                </TableCell>
                <TableCell className="text-foreground font-mono text-xs max-w-xs truncate">
                  {formatData(log.data)}
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white font-mono text-sm">
                  {log.ip_address}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}