import { useState } from "react";
import { useParams } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const id = moduleId || params.id;
  const [moduleName, setModuleName] = useState(`Module ${id}`);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const { toast } = useToast();

  const executeModule = async () => {
    try {
      const response = await fetch(`/api/module/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: input }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Failed to execute module");
      }

      const result = await response.json();
      setOutput(result.result || "No output");

      toast({
        title: "Success",
        description: "Module executed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute module",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="max-w-xs"
            placeholder="Enter module name"
          />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Input Data</label>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter data to process"
              />
            </div>

            <Button onClick={executeModule}>
              Execute Module
            </Button>

            {output && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Output</label>
                <div className="bg-muted p-4 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap">{output}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}