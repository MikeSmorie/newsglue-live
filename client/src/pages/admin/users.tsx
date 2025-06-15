import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Ban, 
  Pause, 
  Play, 
  Trash2, 
  CreditCard, 
  Shield, 
  Eye,
  UserCheck,
  UserX,
  Settings
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  tokens: number;
  subscriptionPlan: string;
  lastLogin: string | null;
  createdAt: string;
  notes: string | null;
  isTestAccount: boolean;
  referralCount?: number;
  aiRequestCount?: number;
}

interface UserAction {
  type: 'suspend' | 'ban' | 'activate' | 'delete' | 'credits' | 'role' | 'subscription' | 'notes';
  userId: number;
  data?: any;
}

const statusColors = {
  active: "bg-green-500",
  suspended: "bg-yellow-500", 
  banned: "bg-red-500"
};

const roleColors = {
  user: "bg-blue-500",
  admin: "bg-purple-500",
  supergod: "bg-gold-500"
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<UserAction | null>(null);
  const [creditsAmount, setCreditsAmount] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSubscription, setNewSubscription] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeUserAction = async (action: UserAction) => {
    try {
      let endpoint = "";
      let method = "POST";
      let body: any = {};

      switch (action.type) {
        case 'suspend':
          endpoint = `/api/admin/user/${action.userId}/suspend`;
          break;
        case 'ban':
          endpoint = `/api/admin/user/${action.userId}/ban`;
          break;
        case 'activate':
          endpoint = `/api/admin/user/${action.userId}/activate`;
          break;
        case 'delete':
          endpoint = `/api/admin/user/${action.userId}`;
          method = "DELETE";
          break;
        case 'credits':
          endpoint = `/api/admin/user/${action.userId}/credits`;
          body = { amount: parseInt(creditsAmount) };
          break;
        case 'role':
          endpoint = `/api/admin/user/${action.userId}/role`;
          body = { role: newRole };
          break;
        case 'subscription':
          endpoint = `/api/admin/user/${action.userId}/subscription`;
          body = { plan: newSubscription };
          break;
        case 'notes':
          endpoint = `/api/admin/user/${action.userId}/notes`;
          body = { notes: userNotes };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Action completed successfully"
        });
        fetchUsers(); // Refresh the user list
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Action failed"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to execute action"
      });
    }

    setActionDialog(null);
    setCreditsAmount("");
    setNewRole("");
    setNewSubscription("");
    setUserNotes("");
  };

  const openActionDialog = (type: UserAction['type'], userId: number, user?: User) => {
    if (user) {
      setSelectedUser(user);
      if (type === 'notes') {
        setUserNotes(user.notes || "");
      }
    }
    setActionDialog({ type, userId });
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Comprehensive user oversight and administration
        </p>
      </div>

      {/* Search and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'suspended').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'banned').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and status
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
                  <TableHead>Subscription</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.isTestAccount && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Test Account
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`${roleColors[user.role as keyof typeof roleColors]} text-white`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${statusColors[user.status as keyof typeof statusColors]} text-white`}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.tokens}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Status Actions */}
                        {user.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog('suspend', user.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog('ban', user.id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {(user.status === 'suspended' || user.status === 'banned') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog('activate', user.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Management Actions */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Manage User: {user.username}</DialogTitle>
                              <DialogDescription>
                                Update user settings and permissions
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Button
                                variant="outline"
                                onClick={() => openActionDialog('credits', user.id, user)}
                                className="justify-start"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Add Credits
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => openActionDialog('role', user.id, user)}
                                className="justify-start"
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => openActionDialog('subscription', user.id, user)}
                                className="justify-start"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Update Subscription
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => openActionDialog('notes', user.id, user)}
                                className="justify-start"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Admin Notes
                              </Button>
                              <Separator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" className="justify-start">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {user.username} and all associated data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => executeUserAction({ type: 'delete', userId: user.id })}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      {actionDialog && (
        <>
          {/* Suspend/Ban/Activate Confirmation */}
          {(actionDialog.type === 'suspend' || actionDialog.type === 'ban' || actionDialog.type === 'activate') && (
            <AlertDialog open={true} onOpenChange={() => setActionDialog(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {actionDialog.type === 'suspend' && 'Suspend User'}
                    {actionDialog.type === 'ban' && 'Ban User'}
                    {actionDialog.type === 'activate' && 'Activate User'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to {actionDialog.type} this user? 
                    {actionDialog.type === 'suspend' && ' They will be unable to log in until reactivated.'}
                    {actionDialog.type === 'ban' && ' They will be permanently banned from the platform.'}
                    {actionDialog.type === 'activate' && ' They will regain access to their account.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => executeUserAction(actionDialog)}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Credits Dialog */}
          {actionDialog.type === 'credits' && (
            <Dialog open={true} onOpenChange={() => setActionDialog(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Credits</DialogTitle>
                  <DialogDescription>
                    Add credits to the user's account
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="credits" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="credits"
                      type="number"
                      value={creditsAmount}
                      onChange={(e) => setCreditsAmount(e.target.value)}
                      className="col-span-3"
                      placeholder="Enter credit amount"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActionDialog(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => executeUserAction(actionDialog)}>
                    Add Credits
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Role Dialog */}
          {actionDialog.type === 'role' && (
            <Dialog open={true} onOpenChange={() => setActionDialog(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change User Role</DialogTitle>
                  <DialogDescription>
                    Update the user's role and permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select new role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supergod">Supergod</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActionDialog(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => executeUserAction(actionDialog)}>
                    Update Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Subscription Dialog */}
          {actionDialog.type === 'subscription' && (
            <Dialog open={true} onOpenChange={() => setActionDialog(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Subscription</DialogTitle>
                  <DialogDescription>
                    Change the user's subscription plan
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subscription" className="text-right">
                      Plan
                    </Label>
                    <Select value={newSubscription} onValueChange={setNewSubscription}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select subscription plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActionDialog(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => executeUserAction(actionDialog)}>
                    Update Subscription
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Notes Dialog */}
          {actionDialog.type === 'notes' && (
            <Dialog open={true} onOpenChange={() => setActionDialog(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Admin Notes</DialogTitle>
                  <DialogDescription>
                    Internal notes for this user (admin only)
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Enter admin notes..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActionDialog(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => executeUserAction(actionDialog)}>
                    Save Notes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}