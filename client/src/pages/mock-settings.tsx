import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function MockSettings() {
  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Settings className="h-6 w-6" />
            Mock Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is a mock settings page. It will be replaced with actual functionality in the future.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
