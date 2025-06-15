import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown, Zap, Users } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
}

export function ExecutivePrivileges() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    }
  });

  // Only show for admin/supergod roles
  if (!user || (user.role !== "admin" && user.role !== "supergod")) {
    return null;
  }

  const isSupergod = user.role === "supergod";
  const privileges = isSupergod ? [
    "Unlimited module access",
    "User management",
    "System configuration",
    "Token administration",
    "Payment oversight",
    "Super-admin powers"
  ] : [
    "Unlimited module access", 
    "User management",
    "Token administration",
    "Payment oversight",
    "Administrative tools"
  ];

  return (
    <Card className="w-full border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSupergod ? (
            <Crown className="h-5 w-5 text-amber-600" />
          ) : (
            <Shield className="h-5 w-5 text-blue-600" />
          )}
          Executive Access
          <Badge variant={isSupergod ? "default" : "secondary"} className="ml-auto">
            {isSupergod ? "SUPERGOD" : "ADMIN"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">
            Trial and subscription restrictions bypassed
          </span>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Users className="h-4 w-4" />
            Granted Privileges:
          </h4>
          <ul className="text-xs space-y-1 pl-6">
            {privileges.map((privilege, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <div className="h-1 w-1 bg-amber-500 rounded-full" />
                {privilege}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {isSupergod 
              ? "You have unrestricted access to all platform features and can manage other administrators."
              : "You have administrative access with the ability to manage users and platform features."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}