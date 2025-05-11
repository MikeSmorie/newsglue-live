import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bot, Sparkles, ThumbsUp, ThumbsDown, Star } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";

export function AIAssistant() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseId] = useState(() => nanoid());
  const [response, setResponse] = useState<{
    answer: string;
    suggestions?: string[];
    actions?: Array<{ type: string; label: string; endpoint: string }>;
    metrics?: {
      errorRate?: string;
      activeUsers?: number;
      systemHealth?: {
        status: string;
        details: Record<string, unknown>;
      };
    };
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

  const submitFeedback = async (helpful: boolean) => {
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          userId: user?.id,
          rating: helpful ? 5 : 1,
          helpful
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast({
        title: "Thank you for your feedback!",
        description: "Your input helps us improve the AI assistant."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback"
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 nav-button">
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
          <div className="mt-4 space-y-4">
            <div className="prose prose-sm dark:prose-invert">
              {response.answer.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>

            {response.metrics && (
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium mb-2">System Metrics</h4>
                <div className="space-y-1 text-sm">
                  {response.metrics.errorRate && (
                    <p>Error Rate: {response.metrics.errorRate}</p>
                  )}
                  {response.metrics.activeUsers && (
                    <p>Active Users: {response.metrics.activeUsers}</p>
                  )}
                  {response.metrics.systemHealth && (
                    <div>
                      <p>System Health: {response.metrics.systemHealth.status}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {response.suggestions && response.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Suggestions:</h4>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {response.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {response.actions && response.actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Quick Actions:</h4>
                <div className="flex flex-wrap gap-2">
                  {response.actions.map((action, i) => (
                    <Button
                      key={i}
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Handle action click based on type
                        if (action.type === "view") {
                          window.location.href = action.endpoint;
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-sm text-muted-foreground mr-2">Was this helpful?</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => submitFeedback(true)}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => submitFeedback(false)}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}