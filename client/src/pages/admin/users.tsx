import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
import { MoreHorizontal, UserX, Ban, Shield, Coins, FileText, TestTube, Trash2, Search, Filter, ArrowUpDown, Users, Activity, UserMinus, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
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
  subscription?: {
    plan: string;
    status: string;
  };
}

interface UserStats {
  totalRequests: number;
  referralCount: number;
}

interface AggregateStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalTokensIssued: number;
  totalTokensUsed: number;
}

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized user row component for performance
const UserRow = memo(({ 
  user, 
  userStats, 
  onAction 
}: { 
  user: User; 
  userStats?: UserStats; 
  onAction: (user: User, action: string) => void;
}) => {
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

  const getSubscriptionBadge = (subscription: User['subscription']) => {
    if (!subscription) return <Badge variant="outline">None</Badge>;
    
    const variants = {
      free: "outline",
      pro: "default",
      enterprise: "secondary"
    } as const;
    
    return <Badge variant={variants[subscription.plan as keyof typeof variants] || "outline"}>
      {subscription.plan}
    </Badge>;
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{user.username}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </TableCell>
      <TableCell>{getRoleBadge(user.role)}</TableCell>
      <TableCell>{getStatusBadge(user.status)}</TableCell>
      <TableCell>{getSubscriptionBadge(user.subscription)}</TableCell>
      <TableCell>{user.tokens}</TableCell>
      <TableCell>
        {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : "Never"}
      </TableCell>
      <TableCell>
        {new Date(user.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>{userStats?.referralCount || 0}</TableCell>
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
            <DropdownMenuItem onClick={() => onAction(user, "suspend")}>
              <UserX className="h-4 w-4 mr-2" />
              Suspend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(user, "ban")}>
              <Ban className="h-4 w-4 mr-2" />
              Ban
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(user, "credits")}>
              <Coins className="h-4 w-4 mr-2" />
              Add Credits
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(user, "role")}>
              <Shield className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(user, "notes")}>
              <FileText className="h-4 w-4 mr-2" />
              Edit Notes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(user, "delete")} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

UserRow.displayName = "UserRow";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Debounced search for performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch all users with subscription data
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?includeSubscriptions=true', {
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

  // Fetch aggregate statistics
  const { data: aggregateStats } = useQuery<AggregateStats>({
    queryKey: ['admin-aggregate-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users/aggregate-stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch aggregate stats');
      return response.json();
    }
  });

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users.filter(user => {
      // Search filter
      const matchesSearch = !debouncedSearch || 
        user.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      // Role filter
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      // Subscription filter
      const matchesSubscription = subscriptionFilter === "all" || 
        (subscriptionFilter === "none" && !user.subscription) ||
        user.subscription?.plan === subscriptionFilter;

      return matchesSearch && matchesStatus && matchesRole && matchesSubscription;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case "tokens":
          aValue = a.tokens;
          bValue = b.tokens;
          break;
        case "lastLogin":
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [users, debouncedSearch, statusFilter, roleFilter, subscriptionFilter, sortField, sortDirection]);

  // Handle sort change
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

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
      queryClient.invalidateQueries({ queryKey: ['admin-aggregate-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-aggregate-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-aggregate-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-aggregate-stats'] });
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

  const handleAction = useCallback((user: User, action: string) => {
    setSelectedUser(user);
    setActionType(action);
    if (action === "notes") {
      setUserNotes(user.notes || "");
    }
    if (action === "role") {
      setNewRole(user.role);
    }
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setSubscriptionFilter("all");
    setSortField("createdAt");
    setSortDirection("desc");
  };

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.activeUsers || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.bannedUsers || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Issued</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.totalTokensIssued || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.totalTokensUsed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main User Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Advanced user management with search, filtering, and analytics
              </CardDescription>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supergod">SuperGod</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscriptions</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="none">No Subscription</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground flex items-center">
              Showing {filteredAndSortedUsers.length} of {users?.length || 0} users
            </div>
          </div>

          {/* User Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("tokens")}
                >
                  <div className="flex items-center gap-1">
                    Tokens
                    {sortField === "tokens" && (
                      sortDirection === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("lastLogin")}
                >
                  <div className="flex items-center gap-1">
                    Last Login
                    {sortField === "lastLogin" && (
                      sortDirection === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Join Date
                    {sortField === "createdAt" && (
                      sortDirection === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Test Account</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  userStats={userStats?.[user.id]}
                  onAction={handleAction}
                />
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
                {actionType === "delete" ? "Delete" : actionType === "ban" ? "Ban" : "Suspend"} User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {actionType} {selectedUser.username}? 
                {actionType === "delete" && " This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionType === "suspend") suspendMutation.mutate(selectedUser.id);
                  else if (actionType === "ban") banMutation.mutate(selectedUser.id);
                  else if (actionType === "delete") deleteMutation.mutate(selectedUser.id);
                  setSelectedUser(null);
                }}
                className={actionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                {actionType === "delete" ? "Delete" : actionType === "ban" ? "Ban" : "Suspend"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}