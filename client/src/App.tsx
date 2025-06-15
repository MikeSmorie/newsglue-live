import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminRegisterPage from "@/pages/admin-register";
import SupergodRegisterPage from "@/pages/supergod-register";
import SupergodDashboard from "@/pages/supergod-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCommunications from "@/pages/admin-communications";
import LogsDashboard from "@/pages/admin/logs-dashboard";
import AdminSubscriptionManagement from "@/pages/admin/subscription-management";
import SubscriptionManager from "@/pages/subscription-manager";
import Dashboard from "@/pages/dashboard";
import ModuleView from "@/pages/module-view";
import SubscriptionManagement from "@/pages/subscription-management";
import SubscriptionPlans from "@/pages/subscription-plans";
import LockedModule from "@/pages/locked-module";
import TwoFactorAuth from "@/pages/two-factor-auth";
import AuditModule from "@/pages/audit-module";
import AuditPage from "@/pages/admin/audit";
import ReferralsPage from "@/pages/referrals";
import AdminUsersPage from "@/pages/admin/users-simple";
import AdminAnalyticsPage from "@/pages/admin/analytics";

import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminProvider } from "@/contexts/admin-context";
import { MainLayout } from "@/components/layout/main-layout";

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "supergod")) {
    return <AuthPage />;
  }
  
  // Log role information
  console.log("[DEBUG] Current user role:", user.role);
  if (user.role === "supergod") {
    console.log("[DEBUG] Super-God privileges unlocked");
  }

  return <Component />;
}

function ProtectedSupergodRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || user.role !== "supergod") {
    // For security, don't even show this route exists to non-supergods
    toast({
      title: "Access Denied",
      description: "This area requires Super-God privileges.",
      variant: "destructive"
    });
    
    return <NotFound />;
  }
  
  console.log("[DEBUG] Super-God exclusive route accessed");
  
  return <Component />;
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/admin-register" component={AdminRegisterPage} />
        <Route path="/supergod-register" component={SupergodRegisterPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  return (
    <MainLayout>
      <Switch>
        {/* Admin routes */}
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin/logs" component={() => <ProtectedAdminRoute component={LogsDashboard} />} />
        <Route path="/admin/subscriptions" component={() => <ProtectedAdminRoute component={AdminSubscriptionManagement} />} />
        <Route path="/admin/subscription-manager" component={() => <ProtectedAdminRoute component={SubscriptionManager} />} />
        <Route path="/admin/communications" component={() => <ProtectedAdminRoute component={AdminCommunications} />} />
        <Route path="/admin/users" component={() => <ProtectedAdminRoute component={AdminUsersPage} />} />
        <Route path="/admin/audit" component={() => <ProtectedSupergodRoute component={AuditPage} />} />
        <Route path="/admin/analytics" component={() => <ProtectedSupergodRoute component={() => import("./pages/admin/analytics").then(m => m.default)} />} />
        
        {/* Supergod exclusive routes */}
        <Route path="/supergod" component={() => <ProtectedSupergodRoute component={SupergodDashboard} />} />
        
        {/* Main routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/module/:id">
          {(params) => <ModuleView moduleId={params.id} />}
        </Route>
        <Route path="/subscription" component={SubscriptionManagement} />
        <Route path="/subscription/plans" component={SubscriptionPlans} />
        <Route path="/referrals" component={ReferralsPage} />
        <Route path="/locked-module" component={LockedModule} />
        <Route path="/2fa" component={TwoFactorAuth} />
        <Route path="/module/omega-10" component={AuditModule} />
        <Route path="/profile" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <AdminProvider>
            <Router />
            <Toaster />
          </AdminProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;