import { useState, useEffect } from "react";
import { useAdmin } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ShieldAlert, Users, Database, Terminal } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function SupergodDashboard() {
  const { isSupergod } = useAdmin();
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Redirect non-supergods
  useEffect(() => {
    if (!isSupergod) {
      toast({
        title: "Access Denied",
        description: "You need Super-God privileges to access this page.",
        variant: "destructive"
      });
      // Redirect to home or another suitable page
      window.location.href = "/";
    }
  }, [isSupergod, toast]);

  // System status query
  const { 
    data: systemData, 
    isLoading: isSystemLoading,
    refetch: refetchSystem
  } = useQuery({
    queryKey: ["supergod-system-status"],
    queryFn: async () => {
      const response = await fetch("/api/supergod/system-status");
      if (!response.ok) {
        throw new Error("Failed to fetch system status");
      }
      return response.json();
    },
    enabled: isSupergod
  });

  // Users data query
  const { 
    data: usersData, 
    isLoading: isUsersLoading,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ["supergod-users"],
    queryFn: async () => {
      const response = await fetch("/api/supergod/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users data");
      }
      return response.json();
    },
    enabled: isSupergod
  });

  // Command execution mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/supergod/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command,
          confirmation: confirmationCode
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to execute command");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Command Executed",
        description: `Successfully executed: ${data.command}`,
      });
      setIsDialogOpen(false);
      setCommand("");
      setConfirmationCode("");
      
      // Refresh data
      refetchSystem();
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleExecuteCommand = () => {
    if (!command) {
      toast({
        title: "Input Required",
        description: "Please enter a command to execute",
        variant: "destructive"
      });
      return;
    }

    if (confirmationCode !== "I_UNDERSTAND_THE_POWER_OF_SUPERGOD") {
      toast({
        title: "Incorrect Confirmation",
        description: "The confirmation code is incorrect",
        variant: "destructive"
      });
      return;
    }

    executeMutation.mutate();
  };

  if (!isSupergod) {
    return null; // Don't render anything for non-supergods
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super-God Dashboard</h1>
          <p className="text-muted-foreground">
            Unlimited access. Ultimate control. Proceed with caution.
          </p>
        </div>
        <Badge variant="outline" className="py-1.5 text-lg bg-red-500/10 border-red-500 text-red-500">
          SUPERGOD MODE
        </Badge>
      </div>

      {/* System Status Card */}
      <Card className="border-red-500/40">
        <CardHeader className="bg-red-500/5">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            System Control Panel
          </CardTitle>
          <CardDescription>
            Critical system information and controls
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isSystemLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Users</h3>
                </div>
                <div className="text-2xl font-bold">
                  {systemData?.system?.users?.count || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {systemData?.system?.users?.note}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Logs</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xl font-bold">
                      {systemData?.system?.logs?.errors || "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {systemData?.system?.logs?.activities || "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold">Security</h3>
                </div>
                <div className="space-y-1">
                  {Object.entries(systemData?.system?.security || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <Badge variant="outline" className="text-xs">
                        {String(value)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <span className="text-xs text-muted-foreground">
            Last checked: {systemData?.system?.lastChecked ? new Date(systemData.system.lastChecked).toLocaleString() : "Never"}
          </span>
          <Button 
            variant="outline"
            onClick={() => refetchSystem()}
            disabled={isSystemLoading}
          >
            {isSystemLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh Status
          </Button>
        </CardFooter>
      </Card>

      {/* Command Terminal Card */}
      <Card className="border-red-500/40">
        <CardHeader className="bg-red-500/5">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-red-500" />
            Super-God Command Terminal
          </CardTitle>
          <CardDescription>
            Execute elevated privilege commands with extreme caution
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Execute Super-God Command
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Execute Super-God Command</DialogTitle>
                <DialogDescription>
                  This action will execute a command with the highest possible privileges.
                  Use with extreme caution as it bypasses all normal security restrictions.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="command" className="text-sm font-medium">
                    Command
                  </label>
                  <Input
                    id="command"
                    placeholder="Enter command..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmation" className="text-sm font-medium">
                    Confirmation Code
                  </label>
                  <Input
                    id="confirmation"
                    placeholder="Enter confirmation code..."
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    To confirm execution, enter: I_UNDERSTAND_THE_POWER_OF_SUPERGOD
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleExecuteCommand}
                  disabled={executeMutation.isPending}
                >
                  {executeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Execute
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Users Table Card */}
      <Card className="border-red-500/40">
        <CardHeader className="bg-red-500/5">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            System Users
          </CardTitle>
          <CardDescription>
            Complete access to all user accounts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableCaption>Complete list of system users.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === "supergod" ? "destructive" : 
                               user.role === "admin" ? "default" : 
                               "outline"}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
                
                {(!usersData?.users || usersData.users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No users found in the system.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t p-4">
          <Button 
            variant="outline"
            onClick={() => refetchUsers()}
            disabled={isUsersLoading}
          >
            {isUsersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh Users
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}