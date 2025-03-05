import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function AppCentral() {
  const [, setLocation] = useLocation();

  const modules = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Module ${i + 1}`,
    path: `/module-${i + 1}`
  }));

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-end mb-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/subscription")}
          className="text-sm"
        >
          Manage Subscription
        </Button>
      </div>

      <div className="w-64"> {/* Fixed width container for the module list */}
        {modules.map((module) => (
          <Card 
            key={module.id}
            className="mb-2 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setLocation(module.path)}
          >
            <div className="p-4">
              <span className="text-lg">{module.name}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}