import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIResponse {
  success: boolean;
  provider: string;
  model: string;
  output: string;
  tokensUsed: number;
  error?: string;
}

export function AIProviderTester() {
  const [input, setInput] = useState("Hello, please introduce yourself and your capabilities.");
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const providers = [
    { value: "openai", label: "OpenAI", status: "online" },
    { value: "claude", label: "Claude", status: "offline" },
    { value: "mistral", label: "Mistral", status: "offline" },
    { value: "auto", label: "Auto-Select", status: "fallback" }
  ];

  const handleTest = async () => {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Please enter some input text to test.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const endpoint = selectedProvider === "auto" 
        ? "/api/ai/providers/generate"
        : `/api/ai/providers/test/${selectedProvider}`;

      const payload = selectedProvider === "auto"
        ? { input, preferredProvider: "openai" }
        : { input };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);

      if (data.success) {
        toast({
          title: "Success",
          description: `${data.provider} responded successfully with ${data.tokensUsed} tokens used.`
        });
      } else {
        toast({
          title: "Provider Error",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setResponse({
        success: false,
        provider: selectedProvider,
        model: "unknown",
        output: "",
        tokensUsed: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case "offline":
        return <Badge variant="outline" className="text-orange-500 border-orange-500">Offline (Stubbed)</Badge>;
      case "fallback":
        return <Badge variant="secondary">Auto-Fallback</Badge>;
      default:
        return <Badge variant="destructive">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Tester</CardTitle>
          <CardDescription>
            Test individual AI providers or the auto-fallback system. Offline providers return stubbed responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex items-center gap-2">
                      <span>{provider.label}</span>
                      {getStatusBadge(provider.status)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Input Text</label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={4}
            />
          </div>

          <Button 
            onClick={handleTest} 
            disabled={loading || !input.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test Provider
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Response
              {response.success ? (
                <Badge variant="default" className="bg-green-500">Success</Badge>
              ) : (
                <Badge variant="destructive">Failed</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Provider: {response.provider} • Model: {response.model} • Tokens: {response.tokensUsed}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response.success ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Output:</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{response.output}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error:</p>
                  <p className="text-sm text-destructive/80">{response.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}