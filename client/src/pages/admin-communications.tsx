import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Edit2, Trash2, Send, Users, Filter, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.string().min(1, "Content is required").max(10000, "Content is too long"),
  importance: z.enum(["normal", "important", "urgent"], {
    required_error: "Please select importance level",
  }),
  targetAudience: z.object({
    type: z.enum(["all", "subscription", "user"], {
      required_error: "Please select target audience type",
    }),
    targetIds: z.array(z.number()).optional(),
  }).refine(data => {
    if (data.type !== "all" && (!data.targetIds || data.targetIds.length === 0)) {
      return false;
    }
    return true;
  }, "Please select at least one target recipient"),
  startDate: z.string({
    required_error: "Start date is required",
  }).refine(date => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date(Date.now() - 24 * 60 * 60 * 1000);
  }, "Start date must be valid and not in the past"),
  endDate: z.string().optional(),
}).refine((data) => {
  if (!data.endDate) return true;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["endDate"], 
});

type FormData = z.infer<typeof formSchema>;

interface Announcement {
  id: number;
  title: string;
  content: string;
  importance: string;
  targetAudience: {
    type: "all" | "subscription" | "user";
    targetIds?: number[];
  };
  createdAt: string;
  startDate?: string;
  endDate?: string;
  sender: {
    username: string;
  };
  requiresResponse: boolean;
  responses: {
    id: number;
    content: string;
    user: {
      username: string;
    };
    createdAt: string;
    readByAdmin: boolean;
  }[];
  recipientStats: {
    total: number;
    read: number;
  };
}

interface Plan {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

export default function AdminCommunications() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all");
  const [isComposing, setIsComposing] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      importance: "normal",
      targetAudience: { type: "all" },
      startDate: new Date().toISOString().slice(0, 16),
    },
    mode: "onChange", // Enable real-time validation
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: !!user && user.role === "admin",
  });
  useEffect(() => {
    if (announcements.length > 0) {
      setIsComposing(false);
    }
  }, [announcements]);
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    enabled: !!user && user.role === "admin",
  });
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === "admin",
  });
  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      try {
        // Format dates for API
        const formattedData = {
          title: values.title.trim(),
          content: values.content.trim(),
          importance: values.importance,
          targetAudience: {
            type: values.targetAudience.type,
            targetIds: values.targetAudience.targetIds || undefined
          },
          startDate: new Date(values.startDate).toISOString(),
          ...(values.endDate && { endDate: new Date(values.endDate).toISOString() })
        };

        // Debug logging
        console.log('Announcement payload:', JSON.stringify(formattedData, null, 2));

        // Validate JSON structure before sending
        try {
          JSON.stringify(formattedData);
        } catch (error) {
          console.error('JSON serialization error:', error);
          throw new Error("Invalid form data structure. Please check all fields.");
        }

        const response = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(formattedData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.message || "Failed to create announcement");
        }

        return response.json();
      } catch (error) {
        console.error("Announcement creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setIsComposing(false);
      toast({
        title: "Announcement created",
        description: "Your message has been sent successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating announcement",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast({
        title: "Announcement deleted",
        description: "The announcement has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete announcement",
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
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("Form errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  // Form submission is only enabled when the form is valid
  const isFormValid = form.formState.isValid;

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-2xl">Communications Dashboard</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter messages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread Responses</SelectItem>
                <SelectItem value="urgent">Urgent Only</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isComposing} onOpenChange={setIsComposing}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Announcement</DialogTitle>
                  <DialogDescription>
                    Send an announcement to your users. All fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Announcement Title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Announcement Content"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="importance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Importance *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Importance" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="important">Important</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetAudience.type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Audience *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Target Audience" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="subscription">By Subscription</SelectItem>
                                <SelectItem value="user">Individual Users</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("targetAudience.type") === "subscription" && plans.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <FormLabel>Select Subscription Plans</FormLabel>
                          {plans.map((plan) => (
                            <div key={plan.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`plan-${plan.id}`}
                                onCheckedChange={(checked) => {
                                  const currentTargets = form.watch("targetAudience.targetIds") || [];
                                  if (checked) {
                                    form.setValue("targetAudience.targetIds", [...currentTargets, plan.id]);
                                  } else {
                                    form.setValue(
                                      "targetAudience.targetIds",
                                      currentTargets.filter(id => id !== plan.id)
                                    );
                                  }
                                }}
                              />
                              <label htmlFor={`plan-${plan.id}`} className="text-sm">
                                {plan.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {form.watch("targetAudience.type") === "user" && users.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <FormLabel>Select Users</FormLabel>
                          {users.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`user-${user.id}`}
                                onCheckedChange={(checked) => {
                                  const currentTargets = form.watch("targetAudience.targetIds") || [];
                                  if (checked) {
                                    form.setValue("targetAudience.targetIds", [...currentTargets, user.id]);
                                  } else {
                                    form.setValue(
                                      "targetAudience.targetIds",
                                      currentTargets.filter(id => id !== user.id)
                                    );
                                  }
                                }}
                              />
                              <label htmlFor={`user-${user.id}`} className="text-sm">
                                {user.username}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Start Date *
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>When the announcement should start appearing to users. Must be a future date.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                End Date
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>When the announcement should stop showing. Must be after the start date.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="requiresResponse"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">
                              Allow user responses
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsComposing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!isFormValid || createMutation.isPending}>
                        {createMutation.isPending ? "Sending..." : "Send Announcement"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Target Audience</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Read Status</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{announcement.title}</span>
                      {announcement.importance !== "normal" && (
                        <Badge variant={announcement.importance === "urgent" ? "destructive" : "default"}>
                          {announcement.importance}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {announcement.targetAudience.type === "all"
                        ? "All Users"
                        : announcement.targetAudience.type === "subscription"
                        ? "Subscription Group"
                        : "Individual Users"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Created: {new Date(announcement.createdAt).toLocaleDateString()}</p>
                      {announcement.startDate && (
                        <p>Starts: {new Date(announcement.startDate).toLocaleDateString()}</p>
                      )}
                      {announcement.endDate && (
                        <p>Ends: {new Date(announcement.endDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {announcement.recipientStats.read}/{announcement.recipientStats.total} read
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {announcement.responses.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {announcement.responses.length} Response{announcement.responses.length !== 1 && 's'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Responses to: {announcement.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {announcement.responses.map((response) => (
                              <Card key={response.id} className={response.readByAdmin ? "bg-muted" : ""}>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{response.user.username}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(response.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm">{response.content}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this announcement?")) {
                            deleteMutation.mutate(announcement.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}