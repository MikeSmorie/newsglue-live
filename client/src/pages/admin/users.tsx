import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Ban, Shield, ShieldCheck, UserX, CreditCard, Crown, FileText, TestTube } from "lucide-react";
import { format } from "date-fns";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  tokens: number;
  lastLogin: string | null;
  createdAt: string;
  notes: string | null;
  isTestAccount: boolean;
  referredBy: number | null;
}

interface UserAction {
  type: 'suspend' | 'ban' | 'delete' | 'credits' | 'role' | 'subscription' | 'test_account';
  userId: number;
  value?: string | number;
}

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<UserAction['type'] | null>(null);
  const [actionValue, setActionValue] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    }
  });

  const userActionMutation = useMutation({
    mutationFn: async (action: UserAction) => {
      const { type, userId, value } = action;
      let url = `/api/admin/user/${userId}/${type}`;
      let method = 'POST';
      let body = value !== undefined ? JSON.stringify({ value }) : undefined;

      if (type === 'delete') {
        method = 'DELETE';
        body = undefined;
      }

      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Action failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedUser(null);
      setActionType(null);
      setActionValue("");
      setConfirmDelete(false);
      toast({
        title: "Success",
        description: "User action completed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const handleAction = (user: AdminUser, type: UserAction['type']) => {
    setSelectedUser(user);
    setActionType(type);
    if (type === 'delete') {
      setConfirmDelete(true);
    }
  };

  const executeAction = () => {
    if (!selectedUser || !actionType) return;

    userActionMutation.mutate({
      type: actionType,
      userId: selectedUser.id,
      value: actionValue || undefined
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>;
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'supergod':
        return <Badge variant="default" className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />SuperGod</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'user':
        return <Badge variant="outline">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and status. Total users: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        {user.tokens || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.isTestAccount && (
                          <Badge variant="outline" className="text-xs">
                            <TestTube className="w-3 h-3 mr-1" />Test
                          </Badge>
                        )}
                        {user.referredBy && (
                          <Badge variant="outline" className="text-xs">Referred</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.status === 'active' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAction(user, 'suspend')}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Suspend
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleAction(user, 'ban')}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Ban
                            </Button>
                          </>
                        )}
                        {user.status !== 'active' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleAction(user, 'suspend')}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(user, 'credits')}
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          Credits
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(user, 'role')}
                        >
                          Role
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleAction(user, 'delete')}
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionType && !confirmDelete} onOpenChange={() => {
        setActionType(null);
        setSelectedUser(null);
        setActionValue("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'suspend' && selectedUser?.status === 'active' ? 'Suspend User' :
               actionType === 'suspend' && selectedUser?.status !== 'active' ? 'Reactivate User' :
               actionType === 'ban' ? 'Ban User' :
               actionType === 'credits' ? 'Adjust Credits' :
               actionType === 'role' ? 'Change Role' :
               actionType === 'subscription' ? 'Modify Subscription' :
               'User Action'}
            </DialogTitle>
            <DialogDescription>
              Action for user: {selectedUser?.username} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {actionType === 'credits' && (
              <div>
                <label className="text-sm font-medium">Credit Amount</label>
                <Input 
                  type="number" 
                  placeholder="Enter credits to add/remove (use negative for removal)"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
              </div>
            )}

            {actionType === 'role' && (
              <div>
                <label className="text-sm font-medium">New Role</label>
                <Select value={actionValue} onValueChange={setActionValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supergod">SuperGod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(actionType === 'suspend' || actionType === 'ban') && (
              <div>
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Textarea 
                  placeholder="Enter reason for this action..."
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={executeAction}
              disabled={userActionMutation.isPending}
              variant={actionType === 'ban' || actionType === 'delete' ? 'destructive' : 'default'}
            >
              {userActionMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account for {selectedUser?.username} and remove all their data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Warning: This action is irreversible</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={executeAction}
              disabled={userActionMutation.isPending}
            >
              {userActionMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}