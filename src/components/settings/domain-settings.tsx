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
  domainIp: string | null;
  allIps?: string[];
  message: string;
  error?: string;
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
    try {
      await configureDomain({ domain, enableSsl: true });
    } catch (err:any) {
      setError(err.message || "Failed to configure domain.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Domain Settings</CardTitle>
          <CardDescription>Configure your custom domain</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
            />
          </div>
          <div className="mt-4">
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

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {dnsStatus && (
            <Alert variant={dnsStatus.isValid ? "default" : "destructive"} className="mt-4">
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

          <Alert className="mt-4">
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
        </CardContent>
      </Card>
    </form>
  );
}
