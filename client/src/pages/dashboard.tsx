import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { TrialBadge } from "@/components/trial-badge";
import { 
  Grid3X3, 
  User, 
  CreditCard, 
  LogOut,
  Crown,
  Shield,
  Users,
  Download
} from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: number;
}

const moduleItems = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Module ${i + 1}`,
  description: `Configure and customize Module ${i + 1} functionality`,
  href: `/module/${i + 1}`,
  icon: Grid3X3
}));

function getRoleIcon(role: string) {
  switch (role) {
    case 'supergod':
      return <Crown className="h-4 w-4 text-red-500" />;
    case 'admin':
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return <Users className="h-4 w-4 text-green-500" />;
  }
}

export default function Dashboard() {
  const { user } = useUser();
  const [, navigate] = useLocation();

  const handleExportProfile = async () => {
    try {
      const response = await fetch("/api/user/export", {
        method: "GET",
        credentials: "include"
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "omega-user-profile.txt";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to export user profile");
      }
    } catch (error) {
      console.error("Error exporting user profile:", error);
    }
  };

  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ["/api/subscription/current-plan"],
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back, {user.username}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Access your modules and manage your account
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <TrialBadge />
          <Button 
            onClick={handleExportProfile}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download My Profile (PDF)
          </Button>
          <Badge variant="outline" className="flex items-center gap-2">
            {getRoleIcon(user.role)}
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Account Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Account in good standing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPlan?.name || 'Free'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Level</CardTitle>
            {getRoleIcon(user.role)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.role === 'supergod' ? 'Full' : user.role === 'admin' ? 'Admin' : 'Standard'}
            </div>
            <p className="text-xs text-muted-foreground">
              System permissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage your account and access key features
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/subscription')} variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
          <Button onClick={() => navigate('/profile')} variant="outline">
            <User className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          {(user.role === 'admin' || user.role === 'supergod') && (
            <Button onClick={() => navigate('/admin')} variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
          )}
          {user.role === 'supergod' && (
            <Button onClick={() => navigate('/supergod')} variant="outline">
              <Crown className="mr-2 h-4 w-4" />
              Supergod Panel
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">Available Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {moduleItems.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.id} className="hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" onClick={() => navigate(module.href)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{module.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {module.description}
                  </CardDescription>
                  <Button className="mt-3 w-full" variant="outline" size="sm">
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}