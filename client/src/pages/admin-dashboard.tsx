import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useAdmin } from "@/contexts/admin-context";
import { Flame } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user } = useUser();
  const { godMode } = useAdmin();
  const [, navigate] = useLocation();

  // Redirect non-admin users
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-destructive p-4">
      <Card className="w-full max-w-4xl mx-auto bg-background/10 border-none text-destructive-foreground">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Flame className="h-12 w-12 animate-pulse" />
          </div>
          <CardTitle className="text-4xl font-bold flex items-center justify-center gap-2">
            🔥 God Mode {godMode ? "Activated" : "Deactivated"} 🔥
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center">
            <p className="text-xl">
              Welcome, Administrator {user.username}. You now have full access to Omega's control panel.
            </p>
            {/* Add more admin controls here */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}