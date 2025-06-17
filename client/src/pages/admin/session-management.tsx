import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Shield, Users, Loader2, RefreshCw } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  tokenVersion?: number;
  isVerified?: boolean;
}

export default function SessionManagementPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [bulkUserIds, setBulkUserIds] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users for session management
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Invalidate single user sessions
  const invalidateSessionsMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}/invalidate-sessions`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invalidate sessions');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sessions invalidated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Bulk invalidate sessions
  const bulkInvalidateMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await fetch('/api/admin/bulk-invalidate-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invalidate sessions');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk invalidation complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setBulkUserIds("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleInvalidateSessions = (userId: number) => {
    invalidateSessionsMutation.mutate(userId);
  };

  const handleBulkInvalidate = () => {
    try {
      const userIds = bulkUserIds
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0);

      if (userIds.length === 0) {
        toast({
          variant: "destructive",
          title: "Invalid input",
          description: "Please enter valid user IDs separated by commas",
        });
        return;
      }

      bulkInvalidateMutation.mutate(userIds);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please enter valid user IDs separated by commas",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load users. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground">
            Manage user sessions and invalidate tokens across all devices
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Single User Session Invalidation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Single User Logout
            </CardTitle>
            <CardDescription>
              Invalidate all sessions for a specific user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="number"
                placeholder="Enter user ID"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={!selectedUserId || invalidateSessionsMutation.isPending}
                >
                  {invalidateSessionsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Invalidating...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Invalidate Sessions
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Session Invalidation</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log out the user from all devices and invalidate all their current sessions. 
                    They will need to log in again. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleInvalidateSessions(parseInt(selectedUserId))}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Invalidate Sessions
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Bulk Session Invalidation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk User Logout
            </CardTitle>
            <CardDescription>
              Invalidate sessions for multiple users at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkUserIds">User IDs (comma-separated)</Label>
              <Input
                id="bulkUserIds"
                placeholder="1, 2, 3, 4"
                value={bulkUserIds}
                onChange={(e) => setBulkUserIds(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  variant="destructive"
                  disabled={!bulkUserIds || bulkInvalidateMutation.isPending}
                >
                  {bulkInvalidateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Bulk Invalidate
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Bulk Session Invalidation</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log out multiple users from all their devices and invalidate all their current sessions. 
                    They will need to log in again. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkInvalidate}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Bulk Invalidate Sessions
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Click on any user to invalidate their sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Token Version</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.users?.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'supergod' ? 'destructive' : user.role === 'admin' ? 'secondary' : 'default'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        v{user.tokenVersion || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            disabled={invalidateSessionsMutation.isPending}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Invalidate Sessions for {user.username}</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will log out {user.username} from all devices and invalidate all their current sessions. 
                              They will need to log in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleInvalidateSessions(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Invalidate Sessions
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}