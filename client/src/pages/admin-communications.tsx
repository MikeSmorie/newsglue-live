import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useState, useEffect } from "react"; // Added for useState


interface Message {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

interface FormData {
  title: string;
  content: string;
}

export default function AdminCommunications() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('Waiting for form submission...');

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      content: ''
    }
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user && user.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      // Create form data
      const formData = new FormData();
      formData.append('title', values.title.trim());
      formData.append('content', values.content.trim());

      // Update debug panel
      setDebugInfo(
        'Sending form data:\n' +
        Array.from(formData.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      );

      const response = await fetch("/api/messages", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Announcement created successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      await createMutation.mutateAsync(values);
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  // Debug panel component with real-time updates from original code
  const DebugPanel = () => (
    <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg max-w-md max-h-64 overflow-auto">
      <h3 className="text-sm font-mono mb-2">Request Debug Panel</h3>
      <div className="flex flex-col gap-2">
        <div className="text-xs text-yellow-400">Content-Type: multipart/form-data</div>
        <pre className="text-xs font-mono whitespace-pre-wrap" id="debug-output">
          {debugInfo} {/* Using the debugInfo state */}
        </pre>
      </div>
    </div>
  );


  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Simple Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Announcement Title" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Announcement Content"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Sending..." : "Send Announcement"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const formData = new FormData();
                    const values = form.getValues();
                    Object.entries(values).forEach(([key, value]) => {
                      formData.append(key, value);
                    });
                    setDebugInfo(
                      'Current form data:\n' +
                      Array.from(formData.entries())
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')
                    );
                  }}
                >
                  Debug Form
                </Button>
              </div>
            </form>
          </Form>

          {/* Debug Panel */}
          <Card className="bg-black/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle className="text-sm">Debug Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {debugInfo}
              </pre>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="space-y-4 mt-8">
            <h3 className="font-semibold">Recent Announcements</h3>
            {messages.map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{message.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      {process.env.NODE_ENV !== 'production' && <DebugPanel />}
    </div>
  );
}