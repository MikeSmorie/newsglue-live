import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ProgressStatus = "idle" | "loading" | "processing" | "success" | "error" | "warning";
export type ProgressSize = "sm" | "default" | "lg";

interface ProgressScreenProps {
  status: ProgressStatus;
  message: string;
  progress?: number;
  total?: number;
  error?: string;
  warning?: string;
  size?: ProgressSize;
  className?: string;
}

const sizeConfig = {
  sm: "w-[300px]",
  default: "w-[400px]",
  lg: "w-[500px]"
};

export function ProgressScreen({ 
  status = "idle",
  message,
  progress = 0,
  total = 0,
  error,
  warning,
  size = "default",
  className 
}: ProgressScreenProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "loading":
        return "Loading...";
      case "processing":
        return "Processing";
      case "success":
        return "Completed";
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      default:
        return "Ready";
    }
  };

  return (
    <Card className={cn(sizeConfig[size], "mx-auto shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          {getStatusText()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{message}</div>

        {(status === "loading" || status === "processing") && total > 0 && (
          <div className="space-y-2">
            <Progress 
              value={(progress / total) * 100} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground text-center">
              {progress} of {total} completed
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
            {error}
          </div>
        )}

        {warning && (
          <div className="text-sm text-yellow-500 bg-yellow-50 dark:bg-yellow-950/50 p-3 rounded-md">
            {warning}
          </div>
        )}
      </CardContent>
    </Card>
  );
}