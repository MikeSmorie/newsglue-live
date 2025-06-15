import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, UserX, Ban, Shield, Coins, ChevronUp, ChevronDown, AlertTriangle, Filter, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  tokens: number;
  lastLogin: string | null;
  createdAt: string;
  trialActive?: boolean;
  trialExpiresAt?: string | null;
}

interface UserResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Filters {
  search: string;
  status: string;
  role: string;
  minTokens: string;
  maxTokens: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const STORAGE_KEY = 'admin-user-filters';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Load filters from localStorage
  const loadFilters = (): Filters => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
    }
    return {
      search: '',
      status: 'all',
      role: 'all',
      minTokens: '',
      maxTokens: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
  };

  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [searchDebounced, setSearchDebounced] = useState(filters.search);

  // Save filters to localStorage
  const saveFilters = useCallback((newFilters: Filters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchDebounced }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDebounced]);

  // Save filters when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters, saveFilters]);

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('q', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.role !== 'all') params.set('role', filters.role);
    if (filters.minTokens) params.set('minTokens', filters.minTokens);
    if (filters.maxTokens) params.set('maxTokens', filters.maxTokens);
    params.set('page', currentPage.toString());
    params.set('limit', '50');
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
    return params.toString();
  }, [filters, currentPage]);

  // Fetch users with filters
  const { data: userResponse, isLoading, error, refetch } = useQuery<UserResponse>({
    queryKey: ['admin-users', filters, currentPage],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/admin/users?${queryString}`, {
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

  // Helper functions
  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    const defaultFilters = {
      search: '',
      status: 'all',
      role: 'all',
      minTokens: '',
      maxTokens: '',
      sortBy: 'createdAt',
      sortOrder: 'desc' as const
    };
    setFilters(defaultFilters);
    setSearchDebounced('');
    setCurrentPage(1);
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => {
    const isActive = filters.sortBy === column;
    const isDesc = filters.sortOrder === 'desc';
    
    return (
      <TableHead 
        className="cursor-pointer select-none hover:bg-muted/50" 
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {isActive && (
            isDesc ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </TableHead>
    );
  };

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
            <div className="text-center text-red-600">
              <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
              <p>{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const users = userResponse?.users || [];
  const pagination = userResponse?.pagination;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions. 
            {pagination && ` Showing ${users.length} of ${pagination.total} users`}
          </CardDescription>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search username or email..."
                    value={searchDebounced}
                    onChange={(e) => setSearchDebounced(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, status: value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={filters.role}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, role: value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supergod">SuperGod</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minTokens">Min Tokens</Label>
                <Input
                  id="minTokens"
                  type="number"
                  placeholder="Min tokens"
                  value={filters.minTokens}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, minTokens: e.target.value }));
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  placeholder="Max tokens"
                  value={filters.maxTokens}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, maxTokens: e.target.value }));
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="flex items-end space-x-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="username">Username</SortableHeader>
                <SortableHeader column="email">Email</SortableHeader>
                <SortableHeader column="role">Role</SortableHeader>
                <TableHead>Status</TableHead>
                <SortableHeader column="tokens">Tokens</SortableHeader>
                <SortableHeader column="lastLogin">Last Login</SortableHeader>
                <SortableHeader column="createdAt">Created</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id}
                  className={cn(
                    user.status === 'suspended' && 'bg-yellow-50 dark:bg-yellow-950/20',
                    user.status === 'banned' && 'bg-red-50 dark:bg-red-950/20'
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.username}
                      {(user.status === 'suspended' || user.status === 'banned') && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{user.tokens?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(user, 'suspend')}
                        className="h-8 w-8 p-0"
                        title="Suspend User"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(user, 'ban')}
                        className="h-8 w-8 p-0"
                        title="Ban User"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(user, 'credits')}
                        className="h-8 w-8 p-0"
                        title="Add Credits"
                      >
                        <Coins className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} 
                ({pagination.total} total users)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={selectedUser !== null && actionType === 'credits'} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits to {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Enter the amount of credits to add to this user's account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="credits">Credits Amount</Label>
            <Input
              id="credits"
              type="number"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button 
              onClick={executeAction}
              disabled={!creditsAmount || parseInt(creditsAmount) <= 0}
            >
              Add Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Suspend Confirmation Dialog */}
      <AlertDialog open={selectedUser !== null && (actionType === 'suspend' || actionType === 'ban')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'suspend' ? 'Suspend' : 'Ban'} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} {selectedUser?.username}? 
              This will {actionType === 'suspend' ? 'temporarily suspend' : 'permanently ban'} their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              {actionType === 'suspend' ? 'Suspend' : 'Ban'} User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}