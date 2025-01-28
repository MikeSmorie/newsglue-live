import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressScreenProps {
  status: "sending" | "success" | "error";
  message: string;
  progress?: number;
  total?: number;
  error?: string;
}

export function ProgressScreen({ status, message, progress = 0, total = 0, error }: ProgressScreenProps) {
  return (
    <Card className="w-[400px] mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === "sending" && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          {status === "sending" ? "Sending Announcement" : 
           status === "success" ? "Announcement Sent" : 
           "Error Sending Announcement"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{message}</div>
        
        {status === "sending" && total > 0 && (
          <div className="space-y-2">
            <Progress value={(progress / total) * 100} />
            <div className="text-xs text-muted-foreground text-center">
              Processing {progress} of {total} recipients
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
