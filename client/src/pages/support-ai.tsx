import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Bot, User, Loader2, ArrowLeft, Trash2, Download } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SupportAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message when component loads
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Welcome to the Omega-V9 Support Center${user?.username ? `, ${user.username}` : ''}!

I'm your dedicated AI assistant, powered by the OmegaAIR multiplexer system. I can provide comprehensive help with:

**Platform Navigation & Features:**
• Dashboard and module explanations
• Navigation tips and shortcuts
• Feature discovery and usage guides

**Account & Profile Management:**
• Profile setup and customization
• Subscription and billing questions
• 2FA and security settings

**Technical Support:**
• Troubleshooting common issues
• Integration guidance
• Best practices and tips

${user?.role === 'supergod' ? `**Supergod Administrative Support:**
• System administration guidance
• AI routing and provider configuration
• User management and platform monitoring
• Advanced troubleshooting and diagnostics

` : ''}${user?.role === 'admin' ? `**Administrator Support:**
• User management and moderation
• System monitoring and logs
• Administrative panel guidance
• Security and compliance topics

` : ''}**Getting Started:**
Try asking me questions like:
• "How do I navigate to Module 5?"
• "What subscription features are available?"
• "How do I enable 2FA?"
• "Explain the dashboard layout"

What would you like to know about the Omega platform?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Enhanced system prompt for full-page experience
      const systemPrompt = `You are the comprehensive Omega-V9 Support Assistant, providing detailed technical and user support for the Omega platform.

Platform Technical Details:
- Omega-V9 with OmegaAIR multiplexer system (Claude, OpenAI, Mistral routing)
- Full-stack architecture: React frontend, Express backend, PostgreSQL database
- Features: 10 modules, AI assistance, PayPal integration, subscription tiers
- Authentication: Multi-role system (user/admin/supergod) with 2FA support
- UI: Responsive design with dark/light themes, accessibility features

Current User Context:
- Username: ${user?.username || 'Guest'}
- Role: ${user?.role || 'user'}
- Access Level: ${user?.role === 'supergod' ? 'Full system administration including AI provider configuration and user management' : user?.role === 'admin' ? 'Administrative functions, user management, and system monitoring' : 'Standard platform features and personal account management'}

Support Guidelines:
- Provide detailed, step-by-step instructions when appropriate
- Include specific UI element references (buttons, menus, etc.)
- For technical issues, suggest specific troubleshooting steps
- Escalate complex issues to human support when necessary
- Be thorough but maintain clarity and organization
- Use formatting (bullets, numbers) to improve readability

For supergod users: Include advanced system administration guidance
For admin users: Cover user management and monitoring capabilities  
For regular users: Focus on navigation, features, and account management

Respond comprehensively to: ${userMessage.content}`;

      const response = await fetch('/api/ai-demo/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          options: {
            temperature: 0.6,
            maxTokens: 1000,
            systemPrompt: systemPrompt
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request. Please try again or contact our support team directly.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Support AI error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a moment, or contact our support team directly if the issue persists.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "AI Assistant Error",
        description: "Unable to connect to support assistant. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const exportChat = () => {
    const chatContent = messages.map(msg => 
      `[${msg.timestamp.toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega-support-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Chat Exported",
      description: "Your conversation has been downloaded as a text file.",
    });
  };

  return (
    <div className="container mx-auto max-w-4xl h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Omega Support Center</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered assistance for the Omega platform
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            OmegaAIR Powered
          </Badge>
          {user && (
            <Badge variant={user.role === 'supergod' ? 'destructive' : user.role === 'admin' ? 'secondary' : 'outline'}>
              {user.role} access
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 m-6 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Support Assistant
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportChat}
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                disabled={messages.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Processing your request...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="p-6">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the Omega platform..."
                disabled={isLoading}
                className="flex-1 min-h-[44px]"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                Press Enter to send • AI responses powered by OmegaAIR
              </p>
              <p className="text-xs text-gray-500">
                {messages.length > 0 && `${messages.length} messages in conversation`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}