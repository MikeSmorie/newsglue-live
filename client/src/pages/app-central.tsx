import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AppCentral() {
  const [, setLocation] = useLocation();
  const [moduleNames, setModuleNames] = useState<string[]>(
    Array.from({ length: 10 }, (_, i) => `Module ${i + 1}`)
  );
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const modules = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: moduleNames[i],
    path: `/module/${i + 1}`
  }));

  const getSuggestion = async () => {
    if (!suggestion.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a description of your app",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/suggest-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: suggestion }),
      });

      if (!response.ok) {
        throw new Error("Failed to get suggestions");
      }

      const data = await response.json();
      const suggestions = data.suggestions || [];

      // Update module names with suggestions
      const newNames = [...moduleNames];
      suggestions.forEach((suggestion: string, index: number) => {
        if (index < newNames.length) {
          newNames[index] = suggestion;
        }
      });
      setModuleNames(newNames);

      toast({
        title: "Success",
        description: "Module suggestions updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get suggestions",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

        <div className="space-y-4 max-w-xl">
          <div className="flex gap-2">
            <Input
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Describe your app to get module suggestions"
              className="flex-1"
            />
            <Button 
              onClick={getSuggestion}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                'Suggest Modules'
              )}
            </Button>
          </div>
        </div>

        <div className="w-64">
          {modules.map((module) => (
            <Card 
              key={module.id}
              className="mb-2 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/module/${module.id}`)}
            >
              <div className="p-4">
                <span className="text-lg">{module.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}