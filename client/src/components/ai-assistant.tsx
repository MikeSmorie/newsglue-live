import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export function AIAssistant() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    answer: string;
    suggestions?: string[];
  } | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: user?.role === "admin" ? "admin" : "user",
          query,
          userId: user?.id
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process query"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          {user?.role === "admin" ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {user?.role === "admin" ? "God Mode AI Assistant" : "AI Assistant"}
          </DialogTitle>
          <DialogDescription>
            {user?.role === "admin" 
              ? "Get insights about the system architecture and technical details"
              : "Get help with using the application"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Ask me anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? "Processing..." : "Ask"}
          </Button>
        </form>

        {response && (
          <div className="mt-4 space-y-2">
            <p className="text-sm">{response.answer}</p>
            {response.suggestions && response.suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Suggestions:</p>
                <ul className="list-disc pl-4 text-sm">
                  {response.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
