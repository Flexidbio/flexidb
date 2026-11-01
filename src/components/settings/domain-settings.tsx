'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Globe, Info, Loader2 } from 'lucide-react'
import { useConfigureDomain, useCurrentDomain } from "@/hooks/use-traefik"
import { Session } from "next-auth"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DnsStatus {
  isValid: boolean
  serverIp: string
  domainIp: string | null
  allIps?: string[]
  message: string
  error?: string
}

export function DomainSettings({ session }: { session: Session }) {
  const [domain, setDomain] = useState("")
  const [dnsStatus, setDnsStatus] = useState<DnsStatus | null>(null)
  const [isCheckingDns, setIsCheckingDns] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dnsError, setDnsError] = useState<string | null>(null)
  const { mutate: configureDomain, isPending } = useConfigureDomain()
  const { data: currentDomain, isLoading: isLoadingDomain } = useCurrentDomain()
  const [selectedProvider, setSelectedProvider] = useState<'custom' | 'nip.io' | 'traefik.me'>('custom')

  useEffect(() => {
    if (currentDomain) {
      setDomain(currentDomain)
      if (currentDomain.includes('.nip.io')) {
        setSelectedProvider('nip.io')
      } else if (currentDomain.includes('.traefik.me')) {
        setSelectedProvider('traefik.me')
      } else {
        setSelectedProvider('custom')
      }
      checkDns(currentDomain)
    }
  }, [currentDomain])

  if (isLoadingDomain) {
    return (
      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Domain settings</CardTitle>
          <CardDescription>Loading domain configuration…</CardDescription>
        </CardHeader>
        <CardContent role="status" aria-label="Loading domain configuration" className="space-y-5">
          <div aria-hidden="true" className="h-11 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div aria-hidden="true" className="h-11 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div aria-hidden="true" className="h-24 rounded-lg bg-muted motion-safe:animate-pulse" />
          <span className="sr-only">Loading domain configuration.</span>
        </CardContent>
      </Card>
    )
  }

  const generateAutoDomain = async (provider: 'nip.io' | 'traefik.me') => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/dns/check?domain=check')
      const data = await response.json()
      const serverIp = data.serverIp
      
      if (!serverIp) {
        toast({
          title: "Error",
          description: "Could not fetch server IP",
          variant: "destructive"
        })
        return
      }

      const newDomain = provider === 'nip.io' 
        ? `app-${serverIp.replace(/\./g, '-')}.nip.io`
        : `app-${serverIp.replace(/\./g, '-')}.traefik.me`

      setDomain(newDomain)
      await checkDns(newDomain)
    } catch (error) {
      console.error('Failed to generate domain:', error)
      toast({
        title: "Error",
        description: "Failed to generate domain",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value as 'custom' | 'nip.io' | 'traefik.me')
    setDomain('')
    setDnsStatus(null)
    setDnsError(null)
    if (value !== 'custom') {
      generateAutoDomain(value as 'nip.io' | 'traefik.me')
    } else {
      setDnsStatus(null)
    }
  }

  const checkDns = async (domain: string) => {
    setIsCheckingDns(true)
    setDnsError(null)
    try {
      const response = await fetch(`/api/dns/check?domain=${encodeURIComponent(domain.trim())}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not check DNS')
      setDnsStatus(data)                   
      return data.isValid
    } catch (error) {
      console.error('Failed to check DNS:', error)
      setDnsStatus(null)
      setDnsError('Could not check DNS. Try checking again in a moment.')
      return false
    } finally {
      setIsCheckingDns(false)
    }
  }

  const handleUpdate = async () => {
    const normalizedDomain = domain.trim();
    if (!normalizedDomain) return;

    const dnsValid = await checkDns(normalizedDomain);
    if (!dnsValid && selectedProvider === 'custom') {
      toast({
        title: "Warning",
        description: "DNS is not properly configured. Please check your DNS settings.",
        variant: "destructive"
      });
      return;
    }

    try {
      await configureDomain(
        { domain: normalizedDomain, enableSsl: true },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Domain configured successfully. Changes will take effect in a few minutes."
            });
            window.location.reload();
          },
          onError: (error) => {
            toast({
              title: "Error",
              description: error.message || "Failed to configure domain. Please check server logs.",
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      console.error('Failed to configure domain:', error);
    }
  };

  const isBusy = isPending || isCheckingDns || isGenerating

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="p-5 pb-5 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg">Domain settings</CardTitle>
        <CardDescription>Configure your custom domain or use an automatic domain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="domain-provider">Domain type</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={isBusy}>
                <SelectTrigger id="domain-provider" className="h-11">
                  <SelectValue placeholder="Select domain type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom domain</SelectItem>
                  <SelectItem value="nip.io">Automatic domain (nip.io)</SelectItem>
                  <SelectItem value="traefik.me">Automatic domain (traefik.me)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder={isGenerating ? "Generating domain…" : selectedProvider === 'custom' ? "example.com" : "Auto-generated domain"}
                value={domain}
                onChange={event => { setDomain(event.target.value); setDnsStatus(null); setDnsError(null) }}
                disabled={isBusy || selectedProvider !== 'custom'}
                aria-describedby="domain-help"
                aria-invalid={dnsStatus?.isValid === false && selectedProvider === 'custom'}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="h-11 font-mono text-sm"
              />
              <p id="domain-help" className="text-xs leading-5 text-muted-foreground">
                {selectedProvider === 'custom' ? "Enter your domain name without http:// or https://." : "This domain uses automatic DNS resolution."}
              </p>
              {isGenerating && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 aria-hidden="true" className="h-3.5 w-3.5 motion-safe:animate-spin" />Generating your domain…</p>}
            </div>

            {currentDomain && (
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Globe aria-hidden="true" className="h-3.5 w-3.5" />Current domain</p>
                <p className="mt-1.5 break-all font-mono text-sm">{currentDomain}</p>
              </div>
            )}
          </div>

          <aside className="rounded-xl bg-muted/50 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Info aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{selectedProvider === 'custom' ? "DNS setup" : "Automatic DNS"}</h3>
            {selectedProvider === 'custom' ? (
              <ol className="mt-3 list-decimal space-y-3 pl-4 text-sm leading-6 text-muted-foreground">
                <li>Point your domain&apos;s A record to your server&apos;s IP address.</li>
                <li>Wait for DNS propagation (may take up to 48 hours).</li>
                <li>An SSL certificate will be automatically provisioned via Let&apos;s Encrypt.</li>
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Using an automatic domain provides immediate access without DNS configuration.</p>
            )}
          </aside>
        </div>

        {dnsStatus && (
          <Alert variant={dnsStatus.isValid ? "default" : "destructive"} className={dnsStatus.isValid ? "rounded-xl border-success/20 bg-success/5 [&>svg]:text-success" : "rounded-xl bg-destructive/5"}>
            {dnsStatus.isValid ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}
            <AlertDescription>
              <p className="font-medium">{dnsStatus.isValid ? "DNS is correctly configured" : "DNS needs attention"}</p>
              {!dnsStatus.isValid && (
                <div className="mt-2 space-y-3 text-sm">
                  <p className="leading-6">Update your domain&apos;s A record to point to your server&apos;s IP address.</p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div><dt className="text-xs">Current IP</dt><dd className="mt-1 break-all font-mono">{dnsStatus.domainIp || "Not resolved"}</dd></div>
                    <div><dt className="text-xs">Required IP</dt><dd className="mt-1 break-all font-mono">{dnsStatus.serverIp || "Unavailable"}</dd></div>
                  </dl>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {dnsError && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />{dnsError}</p>}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button variant="outline" onClick={() => checkDns(domain)} disabled={isBusy || !domain.trim()} className="h-11 gap-2">
          {isCheckingDns ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          {isCheckingDns ? "Checking DNS…" : "Check DNS"}
        </Button>
        <Button 
          onClick={handleUpdate} 
          disabled={isBusy || !domain.trim()}
          className="h-11 gap-2"
        >
          {isPending ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
              Updating domain…
            </>
          ) : (
            'Update domain'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

