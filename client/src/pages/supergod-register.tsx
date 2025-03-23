import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const supergodAuthSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters long"
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters long"
  }),
  secretKey: z.string().min(8, {
    message: "Super-God secret key must be at least 8 characters"
  })
});

type SupergodAuthFormData = z.infer<typeof supergodAuthSchema>;

export default function SupergodRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SupergodAuthFormData>({
    resolver: zodResolver(supergodAuthSchema),
    defaultValues: {
      username: "",
      password: "",
      secretKey: ""
    }
  });

  const onSubmit = async (data: SupergodAuthFormData) => {
    // Verify secret key (in a real app, this would be more secure)
    if (data.secretKey !== "omegasupergod") {
      toast({
        title: "Invalid Super-God key",
        description: "You don't have permission to create a Super-God account",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/api/register-supergod", {
        username: data.username,
        password: data.password
      });

      if (response.status === 200) {
        toast({
          title: "👑 Super-God registration successful",
          description: "You now have the highest level of access"
        });
        setLocation("/app-central");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">👑 Super-God Registration</CardTitle>
          <CardDescription>Register a new Super-God account with elevated privileges</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="supergod_user" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Super-God Secret Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter secret key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Super-God Account"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={() => setLocation("/auth")}>
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}