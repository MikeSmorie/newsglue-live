import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
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
import { useState } from "react";
import { useLocation } from "wouter";
import { Edit2, Trash2, Send, Users, Filter } from "lucide-react";

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
  expiresAt?: string;
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

export default function AdminCommunications() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all");

  // Fetch announcements with responses and read stats
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: !!user && user.role === "admin",
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

  // Mark response as read mutation
  const markResponseReadMutation = useMutation({
    mutationFn: async ({ announcementId, responseId }: { announcementId: number; responseId: number }) => {
      const response = await fetch(`/api/admin/announcements/${announcementId}/responses/${responseId}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark response as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
  });

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filter === "unread") {
      return announcement.responses.some(response => !response.readByAdmin);
    }
    if (filter === "urgent") {
      return announcement.importance === "urgent";
    }
    return true;
  });

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
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Announcement</DialogTitle>
                  <DialogDescription>
                    Send an announcement to your users. You can target specific users or groups.
                  </DialogDescription>
                </DialogHeader>
                {/* Form implementation will be added in the next iteration */}
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
                <TableHead>Sent</TableHead>
                <TableHead>Read Status</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.map((announcement) => (
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
                  <TableCell>{new Date(announcement.createdAt).toLocaleDateString()}</TableCell>
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
