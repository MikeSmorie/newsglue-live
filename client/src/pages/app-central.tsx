import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Shield, LockKeyhole, BarChart3, Bell, Settings } from "lucide-react";

export default function AppCentral() {
  const [, setLocation] = useLocation();

  // Predefined security modules
  const modules = [
    {
      id: 1,
      name: "Security Dashboard",
      icon: <Shield className="h-5 w-5 text-newsBlue" />,
      description: "Overview of system security status"
    },
    {
      id: 2,
      name: "Access Control",
      icon: <LockKeyhole className="h-5 w-5 text-newsBlue" />,
      description: "Manage user permissions and access"
    },
    {
      id: 3,
      name: "Threat Analytics",
      icon: <BarChart3 className="h-5 w-5 text-newsBlue" />,
      description: "Advanced threat detection and analysis"
    },
    {
      id: 4,
      name: "Alert Center",
      icon: <Bell className="h-5 w-5 text-newsBlue" />,
      description: "Security alerts and notifications"
    },
    {
      id: 5,
      name: "System Configuration",
      icon: <Settings className="h-5 w-5 text-newsBlue" />,
      description: "Configure security settings"
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Security Modules</h1>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/subscription")}
            className="text-sm"
          >
            Manage Subscription
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card 
              key={module.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/module/${module.id}`)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  {module.icon}
                  <span className="text-lg font-medium">{module.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}