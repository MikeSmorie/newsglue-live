import { useUser } from "@/hooks/use-user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Ban, Clock } from "lucide-react";

interface LoginStatusGuardProps {
  children: React.ReactNode;
}

export default function LoginStatusGuard({ children }: LoginStatusGuardProps) {
  const { user } = useUser();

  if (!user) {
    return <>{children}</>;
  }

  // Show warning for suspended users but allow access
  if (user.status === 'suspended') {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your account is currently suspended. Some features may be limited.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Show warning for banned users but allow access
  if (user.status === 'banned') {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            Your account has been banned. Please contact support for assistance.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Show trial expiration warning for trial users
  if (user.trialActive && user.trialExpiresAt) {
    const expirationDate = new Date(user.trialExpiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3 && daysLeft > 0) {
      return (
        <div className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Consider upgrading to continue using all features.
            </AlertDescription>
          </Alert>
          {children}
        </div>
      );
    }
  }

  return <>{children}</>;
}