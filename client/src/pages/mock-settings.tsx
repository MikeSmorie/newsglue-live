import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Lightbulb, Moon } from "lucide-react";

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
        <CardContent className="space-y-6">
          <p className="text-muted-foreground mb-6">
            This is a mock settings page. It will be replaced with actual functionality in the future.
          </p>

          {/* Mock Toggle Feature */}
          <div className="flex items-center justify-between">
            <Label htmlFor="feature-x" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Enable Feature X
            </Label>
            <Switch id="feature-x" />
          </div>

          {/* Mock Mode Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Select Mode
            </Label>
            <Select defaultValue="light">
              <SelectTrigger>
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}