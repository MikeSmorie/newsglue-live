import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PlaceholderApp() {
  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Construction className="h-6 w-6" />
            Placeholder App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This is a placeholder page for future app integration.
          </p>
          
          {/* Mock Navigation */}
          <nav className="flex gap-4">
            <Link href="/mock-dashboard">
              <Button variant="outline">Mock Dashboard</Button>
            </Link>
            <Link href="/mock-settings">
              <Button variant="outline">Mock Settings</Button>
            </Link>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
