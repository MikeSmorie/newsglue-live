import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Key, 
  AlertCircle,
  CheckCircle,
  Smartphone,
  Lock
} from "lucide-react";

interface TwoFactorStatus {
  enabled: boolean;
  secret?: string;
}

export default function TwoFactorAuth() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isProduction = import.meta.env.PROD;
  const isSandbox = !isProduction;

  // Fetch 2FA status
  const { data: twoFactorStatus, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/2fa/status"],
    enabled: !!user,
  });

  // Enable 2FA mutation
  const enable2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to enable 2FA");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to disable 2FA");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled) {
      enable2FAMutation.mutate();
    } else {
      disable2FAMutation.mutate();
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a verification code.",
      });
      return;
    }

    setIsProcessing(true);
    // Mock verification process
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Code Verified",
        description: "Your verification code has been accepted.",
      });
      setVerificationCode("");
    }, 2000);
  };

  const maskSecret = (secret?: string) => {
    if (!secret) return "Not set";
    return secret.slice(0, 4) + "••••••••••••" + secret.slice(-4);
  };

  if (!user) return null;

  const isEnabled = twoFactorStatus?.enabled || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add an extra layer of security to your account
          </p>
        </div>
        <Badge variant={isEnabled ? "default" : "outline"} className="flex items-center gap-2">
          {isEnabled ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {/* Sandbox Mode Notice */}
      {isSandbox && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">💡 2FA is mocked in sandbox mode</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* 2FA Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Enable/Disable 2FA */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Shield className="h-5 w-5" />
              Enable 2FA
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Secure your account with two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEnabled ? "Your account is protected" : "Add extra security to your account"}
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle2FA}
                disabled={enable2FAMutation.isPending || disable2FAMutation.isPending || isLoading}
              />
            </div>

            {isEnabled && (
              <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">2FA is active on your account</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Code Testing */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Smartphone className="h-5 w-5" />
              Test Verification
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Test your 2FA setup with a verification code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-gray-900 dark:text-white">
                Verification Code
              </Label>
              <Input
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                disabled={!isEnabled}
              />
            </div>
            <Button
              onClick={handleVerifyCode}
              disabled={!isEnabled || isProcessing || !verificationCode.trim()}
              className="w-full"
              variant="outline"
            >
              {isProcessing ? "Verifying..." : "Verify Code"}
            </Button>
            {!isEnabled && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable 2FA to test verification codes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secret Information */}
      {isEnabled && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Key className="h-5 w-5" />
              2FA Secret
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your two-factor authentication secret key (keep this secure)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Secret Key</Label>
                <code className="block mt-1 text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {maskSecret(twoFactorStatus?.secret)}
                </code>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This secret is used to generate time-based one-time passwords (TOTP) for your account.
                Keep it secure and never share it with anyone.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">How to Set Up 2FA</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Follow these steps to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              <span>Download an authenticator app like Google Authenticator, Authy, or 1Password</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              <span>Enable 2FA using the toggle above to generate your secret key</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              <span>Add your account to the authenticator app using the secret key</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">
                4
              </span>
              <span>Test your setup by entering a verification code above</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}