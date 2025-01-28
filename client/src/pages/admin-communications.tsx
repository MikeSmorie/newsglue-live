import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/ui/form";
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
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  importance: z.enum(["normal", "important", "urgent"]),
  targetAudience: z.object({
    type: z.enum(["all", "subscription", "user"]),
    targetIds: z.array(z.number()).optional(),
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional().refine((date) => {
    if (!date) return true;
    const startDate = new Date(date);
    return !isNaN(startDate.getTime());
  }, "Invalid end date"),
  requiresResponse: z.boolean().default(false),
});

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
  const [isComposing, setIsComposing] = useState(true);  // Set to true by default

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      importance: "normal",
      targetAudience: { type: "all" },
      requiresResponse: false,
    },
  });

  // Fetch announcements with responses and read stats
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: !!user && user.role === "admin",
  });

  // Close compose modal if announcements exist
  useEffect(() => {
    if (announcements.length > 0) {
      setIsComposing(false);
    }
  }, [announcements]);

  // Fetch subscription plans for targeting
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch users for individual targeting
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === "admin",
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Validate dates
      if (values.startDate && values.endDate) {
        const start = new Date(values.startDate);
        const end = new Date(values.endDate);
        if (end < start) {
          throw new Error("End date must be after start date");
        }
      }

      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setIsComposing(false);
      toast({
        title: "Announcement created",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create announcement",
      });
    },
  });

  // Delete announcement mutation
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  // Redirect non-admin users
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

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
                    Send an announcement to your users. You can target specific users or groups.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Announcement Title"
                          {...form.register("title")}
                        />
                        {form.formState.errors.title && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.title.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Textarea
                          placeholder="Announcement Content"
                          className="min-h-[100px]"
                          {...form.register("content")}
                        />
                        {form.formState.errors.content && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.content.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Select
                          value={form.watch("importance")}
                          onValueChange={(value) => form.setValue("importance", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Importance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="important">Important</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Select
                          value={form.watch("targetAudience.type")}
                          onValueChange={(value) => {
                            form.setValue("targetAudience", { type: value as any });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Target Audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="subscription">By Subscription</SelectItem>
                            <SelectItem value="user">Individual Users</SelectItem>
                          </SelectContent>
                        </Select>

                        {form.watch("targetAudience.type") === "subscription" && plans.length > 0 && (
                          <div className="mt-4">
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
                          <div className="mt-4">
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
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                              Start Date
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>When the announcement should start appearing to users</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </label>
                            <Input
                              type="datetime-local"
                              {...form.register("startDate")}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                              End Date
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>When the announcement should stop showing (optional)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </label>
                            <Input
                              type="datetime-local"
                              {...form.register("endDate")}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requiresResponse"
                          checked={form.watch("requiresResponse")}
                          onCheckedChange={(checked) => {
                            form.setValue("requiresResponse", checked as boolean);
                          }}
                        />
                        <label htmlFor="requiresResponse" className="text-sm">
                          Allow user responses
                        </label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsComposing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
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
                                  {!response.readByAdmin && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => markResponseReadMutation.mutate({
                                        announcementId: announcement.id,
                                        responseId: response.id
                                      })}
                                    >
                                      Mark as Read
                                    </Button>
                                  )}
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