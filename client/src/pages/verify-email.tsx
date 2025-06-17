import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";

const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResendVerificationFormData = z.infer<typeof resendVerificationSchema>;

interface TokenValidation {
  valid: boolean;
  message: string;
  email?: string;
}

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get token from URL params
  const token = new URLSearchParams(window.location.search).get('token');

  const form = useForm<ResendVerificationFormData>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: {
      email: "",
    },
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValidation({
          valid: false,
          message: "No verification token provided"
        });
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-verification-token/${token}`);
        const result = await response.json();
        
        setTokenValidation(result);
        
        // If token is valid, automatically verify the email
        if (result.valid) {
          await verifyEmailWithToken(token);
        }
      } catch (error) {
        setTokenValidation({
          valid: false,
          message: "Failed to validate token"
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const verifyEmailWithToken = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to verify email");
      }

      setIsSuccess(true);
      toast({
        title: "Email verified successfully",
        description: "Your email address has been confirmed. You can now access all features.",
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message,
      });
    }
  };

  const onResendSubmit = async (data: ResendVerificationFormData) => {
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send verification email");
      }

      toast({
        title: "Verification email sent",
        description: "Please check your email for verification instructions.",
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Validating verification token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Email verified!</CardTitle>
            <CardDescription>
              Your email address has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You now have full access to all platform features.
              </p>
            </div>

            <Link href="/auth">
              <Button className="w-full">
                Continue to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state or no token provided
  if (!tokenValidation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
            <CardDescription>
              {tokenValidation?.message || "Verify your email address to access all features"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!token && (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive a verification email? Enter your email address below to resend it.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onResendSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              {...field}
                              disabled={isResending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isResending}>
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending verification email...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend verification email
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}

            {token && (
              <div className="text-center space-y-4">
                <div className="mx-auto mb-2 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {tokenValidation?.message || "This verification link is invalid or has expired."}
                </p>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => window.location.href = '/verify-email'}
                    className="w-full"
                  >
                    Request new verification email
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <Link href="/auth">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}