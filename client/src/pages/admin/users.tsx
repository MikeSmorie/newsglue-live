import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, UserX, Ban, Shield, Coins, FileText, TestTube, Trash2 } from "lucide-react";
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
  notes: string | null;
  isTestAccount: boolean;
  referredBy: number | null;
}

interface UserStats {
  totalRequests: number;
  referralCount: number;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");

  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch user stats
  const { data: userStats } = useQuery<Record<number, UserStats>>({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    }
  });

  // User action mutations
  const suspendMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to suspend user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User suspended successfully" });
    }
  });

  const banMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to ban user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User banned successfully" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User deleted successfully" });
    }
  });

  const creditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update credits');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Credits updated successfully" });
      setCreditsAmount("");
    }
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Role updated successfully" });
      setNewRole("");
    }
  });

  const notesMutation = useMutation({
    mutationFn: async ({ userId, notes, isTestAccount }: { userId: number; notes: string; isTestAccount: boolean }) => {
      const response = await fetch(`/api/admin/users/${userId}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, isTestAccount }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update user data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User data updated successfully" });
      setUserNotes("");
      setSelectedUser(null);
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
    if (action === "notes") {
      setUserNotes(user.notes || "");
    }
    if (action === "role") {
      setNewRole(user.role);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
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
                <TableHead>Referrals</TableHead>
                <TableHead>Test Account</TableHead>
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
                  <TableCell>{userStats?.[user.id]?.referralCount || 0}</TableCell>
                  <TableCell>
                    {user.isTestAccount && <Badge variant="outline">Test</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction(user, "suspend")}>
                          <UserX className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(user, "ban")}>
                          <Ban className="h-4 w-4 mr-2" />
                          Ban
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(user, "credits")}>
                          <Coins className="h-4 w-4 mr-2" />
                          Add Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(user, "role")}>
                          <Shield className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(user, "notes")}>
                          <FileText className="h-4 w-4 mr-2" />
                          Edit Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(user, "delete")} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      {selectedUser && actionType === "credits" && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credits to {selectedUser.username}</DialogTitle>
              <DialogDescription>Enter the number of credits to add</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="credits">Credits Amount</Label>
                <Input
                  id="credits"
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button 
                onClick={() => creditsMutation.mutate({ userId: selectedUser.id, amount: parseInt(creditsAmount) })}
                disabled={!creditsAmount || creditsMutation.isPending}
              >
                Add Credits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && actionType === "role" && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role for {selectedUser.username}</DialogTitle>
              <DialogDescription>Select a new role for this user</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supergod">Super God</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button 
                onClick={() => roleMutation.mutate({ userId: selectedUser.id, role: newRole })}
                disabled={!newRole || roleMutation.isPending}
              >
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && actionType === "notes" && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Data for {selectedUser.username}</DialogTitle>
              <DialogDescription>Update admin notes and account settings</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Enter admin notes..."
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="test-account"
                  checked={selectedUser.isTestAccount}
                  onCheckedChange={(checked) => 
                    setSelectedUser(prev => prev ? { ...prev, isTestAccount: checked } : null)
                  }
                />
                <Label htmlFor="test-account">Mark as test account</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button 
                onClick={() => notesMutation.mutate({ 
                  userId: selectedUser.id, 
                  notes: userNotes,
                  isTestAccount: selectedUser.isTestAccount
                })}
                disabled={notesMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation dialogs for destructive actions */}
      {selectedUser && (actionType === "suspend" || actionType === "ban" || actionType === "delete") && (
        <AlertDialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === "delete" ? "Delete" : actionType === "suspend" ? "Suspend" : "Ban"} User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {actionType} {selectedUser.username}? 
                {actionType === "delete" && " This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionType === "suspend") suspendMutation.mutate(selectedUser.id);
                  if (actionType === "ban") banMutation.mutate(selectedUser.id);
                  if (actionType === "delete") deleteMutation.mutate(selectedUser.id);
                  setSelectedUser(null);
                }}
                className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                {actionType === "delete" ? "Delete" : actionType === "suspend" ? "Suspend" : "Ban"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}