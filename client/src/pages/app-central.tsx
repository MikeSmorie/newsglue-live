import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function AppCentral() {
  const [, setLocation] = useLocation();

  const modules = [
    { id: 1, name: "Error Tracking", path: "/error-tracking" },
    { id: 2, name: "Security Monitor", path: "/security-monitor" },
    { id: 3, name: "System Health", path: "/system-health" },
    { id: 4, name: "User Management", path: "/user-management" },
    { id: 5, name: "AI Assistant", path: "/ai-assistant" },
    { id: 6, name: "Access Control", path: "/access-control" },
    { id: 7, name: "Analytics", path: "/analytics" },
    { id: 8, name: "Audit Logs", path: "/audit-logs" },
    { id: 9, name: "Threat Detection", path: "/threat-detection" },
    { id: 10, name: "Settings", path: "/settings" }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">App Central</h1>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/subscription")}
          className="text-sm"
        >
          Manage Subscription
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((module) => (
          <Card 
            key={module.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setLocation(module.path)}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-muted-foreground">
                {module.id}
              </span>
              <h3 className="text-lg font-semibold">{module.name}</h3>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}