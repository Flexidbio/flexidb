"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCreateTraefikRoute, useCurrentDomain } from "@/hooks/use-traefik";

export function DomainSettings() {
  const { data: currentDomain, isLoading: isLoadingDomain } = useCurrentDomain();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createRoute, isPending } = useCreateTraefikRoute();

  useEffect(() => {
    if (currentDomain) {
      setDomain(currentDomain);
    }
  }, [currentDomain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!domain.trim()) {
      setError("Domain is required");
      return;
    }

    // Create Traefik route configuration
    createRoute({
      name: "flexidb-app",
      domain: domain.trim(),
      targetPort: 3000,
      targetContainer: "localhost", // or your Next.js container name if running in Docker
      tlsEnabled: true, // Enable HTTPS
      middlewares: [], // Add any required middlewares
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Domain Settings</CardTitle>
          <CardDescription>
            Configure your custom domain to access your FlexiDB instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDomain ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your domain name without http:// or https://
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  After updating your domain, make sure to:
                  <ol className="list-decimal ml-4 mt-2">
                    <li>Point your domain's A record to your server's IP address</li>
                    <li>Wait for DNS propagation (may take up to 48 hours)</li>
                    <li>SSL certificate will be automatically provisioned via Let's Encrypt</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
