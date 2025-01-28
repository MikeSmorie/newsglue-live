import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Lock, Check, X, ExternalLink, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/admin-context";
import { SubscriptionComparison } from "@/components/subscription-comparison";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Feature {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface Plan {
  id: number;
  name: string;
  price: number;
}

interface Announcement {
  id: number;
  announcement: {
    title: string;
    content: string;
    importance: string;
    sender: {
      username: string;
    };
    createdAt: string;
    startDate?: string;
    endDate?: string;
  };
  read: boolean;
}

export default function UserDashboard() {
  const { user } = useUser();
  const { godMode } = useAdmin();
  const { toast } = useToast();

  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    enabled: !!user,
  });

  const handleMarkAsRead = async (announcementId: number) => {
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        credentials: 'include'
      });

      // Refresh the announcements data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark announcement as read",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-10 space-y-8">
      <Card className="bg-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Dashboard</CardTitle>
              <CardDescription className="mt-2">
                Current Plan: <span className="font-bold text-primary">{currentPlan?.name || "No active plan"}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Announcements
                    {announcements.filter(a => !a.read).length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {announcements.filter(a => !a.read).length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Announcements & Messages</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {announcements.length === 0 ? (
                        <p className="text-center text-muted-foreground">No announcements yet</p>
                      ) : (
                        announcements.map((item) => (
                          <Card key={item.id} className={item.read ? 'bg-muted' : 'bg-background'}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  {item.announcement.title}
                                  {!item.read && (
                                    <Badge variant="default" className="ml-2">New</Badge>
                                  )}
                                </CardTitle>
                                <Badge variant={
                                  item.announcement.importance === 'urgent' 
                                    ? 'destructive' 
                                    : item.announcement.importance === 'important'
                                      ? 'default'
                                      : 'secondary'
                                }>
                                  {item.announcement.importance}
                                </Badge>
                              </div>
                              <CardDescription>
                                From {item.announcement.sender.username} • {new Date(item.announcement.createdAt).toLocaleDateString()}
                                {item.announcement.startDate && (
                                  <span> • Starts: {new Date(item.announcement.startDate).toLocaleDateString()}</span>
                                )}
                                {item.announcement.endDate && (
                                  <span> • Ends: {new Date(item.announcement.endDate).toLocaleDateString()}</span>
                                )}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-4">
                                {item.announcement.content}
                              </p>
                              {!item.read && (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => handleMarkAsRead(item.id)}
                                >
                                  Mark as Read
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => window.location.href = "/subscriptions"}>
                Manage Subscription
              </Button>
              {godMode && (
                <Button variant="secondary" onClick={() => window.location.href = "/admin"}>
                  Return to Admin View
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <SubscriptionComparison />
    </div>
  );
}