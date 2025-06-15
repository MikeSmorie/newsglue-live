import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, UserX, Ban, Shield, Coins, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  tokens: number;
  lastLogin: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<string>("");

  // Fetch all users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - Admin privileges required');
        }
        throw new Error('Failed to fetch users');
      }
      return response.json();
    }
  });

  // User action mutations
  const actionMutation = useMutation({
    mutationFn: async ({ userId, action, data }: { userId: number; action: string; data?: any }) => {
      let url = `/api/admin/users/${userId}`;
      let method = 'POST';
      
      switch (action) {
        case 'suspend':
          url += '/suspend';
          break;
        case 'ban':
          url += '/ban';
          break;
        case 'credits':
          url += '/credits';
          break;
        case 'delete':
          method = 'DELETE';
          break;
        default:
          throw new Error('Invalid action');
      }

      const response = await fetch(url, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Action failed');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: `User ${variables.action} successful` });
      setSelectedUser(null);
      setCreditsAmount("");
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Action failed", 
        description: error.message 
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      suspended: "secondary", 
      banned: "destructive"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      user: "outline",
      admin: "secondary",
      supergod: "default"
    } as const;
    
    return <Badge variant={variants[role as keyof typeof variants] || "outline"}>{role}</Badge>;
  };

  const handleAction = (user: User, action: string) => {
    setSelectedUser(user);
    setActionType(action);
  };

  const executeAction = () => {
    if (!selectedUser) return;

    const data = actionType === 'credits' ? { amount: parseInt(creditsAmount) } : undefined;
    actionMutation.mutate({ 
      userId: selectedUser.id, 
      action: actionType,
      data 
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              {error.message || 'Failed to load users'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{user.tokens}</TableCell>
                  <TableCell>
                    {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction(user, "suspend")}
                        disabled={actionMutation.isPending}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction(user, "ban")}
                        disabled={actionMutation.isPending}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Ban
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction(user, "credits")}
                        disabled={actionMutation.isPending}
                      >
                        <Coins className="h-4 w-4 mr-1" />
                        Credits
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Credits Dialog */}
      {selectedUser && actionType === "credits" && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credits to {selectedUser.username}</DialogTitle>
              <DialogDescription>Enter the number of credits to add</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button 
                onClick={executeAction}
                disabled={!creditsAmount || actionMutation.isPending}
              >
                Add Credits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation dialogs for destructive actions */}
      {selectedUser && (actionType === "suspend" || actionType === "ban") && (
        <AlertDialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === "suspend" ? "Suspend" : "Ban"} User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {actionType} {selectedUser.username}? 
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeAction} disabled={actionMutation.isPending}>
                {actionType === "suspend" ? "Suspend" : "Ban"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}