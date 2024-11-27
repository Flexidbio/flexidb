"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useConfigureDomain, useCurrentDomain } from "@/hooks/use-traefik";

interface DnsStatus {
  isValid: boolean;
  serverIp: string;
  domainIp: string;
}

export function DomainSettings() {
  const { data: currentDomain, isLoading: isLoadingDomain } = useCurrentDomain();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dnsStatus, setDnsStatus] = useState<DnsStatus | null>(null);
  const [checkingDns, setCheckingDns] = useState(false);

  const { mutate: configureDomain, isPending } = useConfigureDomain();

  useEffect(() => {
    if (currentDomain) {
      setDomain(currentDomain);
      checkDns(currentDomain);
    }
  }, [currentDomain]);

  const checkDns = async (domainToCheck: string) => {
    setCheckingDns(true);
    try {
      const response = await fetch(`/api/dns/check?domain=${domainToCheck}`);
      const data = await response.json();
      setDnsStatus(data);
    } catch (error) {
      console.error('DNS check failed:', error);
    } finally {
      setCheckingDns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!domain.trim()) {
      setError("Domain is required");
      return;
    }

    try {
      await configureDomain({
        domain: domain.trim(),
        enableSsl: true
      });

      // Check DNS after configuration
      await checkDns(domain.trim());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to configure domain');
    }
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
                  <Button type="submit" disabled={isPending || checkingDns}>
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

              {dnsStatus && (
                <Alert variant={dnsStatus.isValid ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {dnsStatus.isValid ? (
                      "DNS is correctly configured"
                    ) : (
                      <>
                        DNS is not correctly configured. Please update your domain's A record to point to {dnsStatus.serverIp}.
                        <br />
                        Current IP: {dnsStatus.domainIp}
                        <br />
                        Required IP: {dnsStatus.serverIp}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

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
