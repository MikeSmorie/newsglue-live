import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { HighContrastModule } from "@/components/high-contrast-module";

export default function AppCentral() {
  const [, setLocation] = useLocation();
  
  // Create 10 empty modules
  const modules = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Module ${i + 1}`
  }));

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/subscription")}
            className="text-sm"
          >
            Manage Subscription
          </Button>
        </div>

        <div className="w-64">
          {modules.map((module) => (
            <HighContrastModule 
              key={module.id}
              id={module.id}
              name={module.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}