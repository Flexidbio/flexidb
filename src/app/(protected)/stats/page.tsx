'use client';

import { useStatus } from "@/hooks/use-status";
import { StatusCard } from "@/components/status/status-card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Activity, Server, CheckCircle2, Clock3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StatusPage() {
  const { data: status, isLoading, isError, refetch } = useStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const serviceStatuses = [status?.services?.database?.status, status?.services?.traefik?.status, status?.services?.app?.status];
  const healthyServices = serviceStatuses.filter(service => service === "healthy").length;
  const allHealthy = healthyServices === serviceStatuses.length;
  const hasUnhealthyService = serviceStatuses.some(service => service === "unhealthy");
  const hasServiceData = serviceStatuses.some(service => service && service !== "unknown");
  const updatedAt = status?.timestamp ? new Date(status.timestamp) : null;
  const hasUpdateTime = updatedAt !== null && !Number.isNaN(updatedAt.getTime());

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">System status</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Service health and resource usage for your server.</p>
        </div>
        <Button onClick={refreshStatus} variant="outline" disabled={isLoading || isRefreshing} className="h-11 gap-2 self-start sm:self-auto">
          <RefreshCw aria-hidden="true" className={cn("h-4 w-4", isRefreshing && "motion-safe:animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading system status" className="space-y-8">
          <div aria-hidden="true" className="h-14 rounded-xl border bg-card" />
          {[3, 2].map((count, index) => (
            <div key={index} className="space-y-4">
              <div aria-hidden="true" className="h-6 w-36 rounded bg-muted motion-safe:animate-pulse" />
              <div className={cn("grid gap-4 sm:grid-cols-2", count === 3 && "xl:grid-cols-3")}>
                {Array.from({ length: count }, (_, i) => (
                  <div key={i} aria-hidden="true" className="space-y-5 rounded-xl border bg-card p-5">
                    <div className="h-4 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
                    <div className="h-8 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
                    <div className="h-2 rounded bg-muted motion-safe:animate-pulse" />
                    <div className="h-10 rounded bg-muted motion-safe:animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <span className="sr-only">Loading service health and server resources.</span>
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center">
          <AlertCircle aria-hidden="true" className="h-9 w-9 text-destructive" />
          <h2 className="mt-5 text-xl font-semibold">Error loading system status</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">The server&apos;s health data could not be loaded. Try refreshing to reconnect.</p>
          <Button onClick={refreshStatus} disabled={isRefreshing} className="mt-6 gap-2">
            <RefreshCw aria-hidden="true" className={cn("h-4 w-4", isRefreshing && "motion-safe:animate-spin")} />
            {isRefreshing ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card px-5 py-4 sm:flex-row sm:items-center">
            <p className={cn("flex items-center gap-2 text-sm font-medium", allHealthy ? "text-success" : hasUnhealthyService ? "text-destructive" : hasServiceData ? "text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
              {allHealthy ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}
              {allHealthy ? "All services healthy" : hasServiceData ? `${healthyServices} of ${serviceStatuses.length} services healthy` : "Waiting for service health data"}
            </p>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Clock3 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <time dateTime={hasUpdateTime ? updatedAt.toISOString() : undefined}>{hasUpdateTime ? `Last updated ${updatedAt.toLocaleString()}` : "Update time unavailable"}</time>
            </p>
          </div>

          <section aria-labelledby="services-title" className="space-y-4">
            <h2 id="services-title" className="flex items-center gap-2.5 text-lg font-semibold"><Activity aria-hidden="true" className="h-5 w-5 text-muted-foreground" />Services</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatusCard title="Database" status={status?.services?.database?.status || 'unknown'} metrics={status?.services?.database?.metrics || undefined} />
              <StatusCard title="Traefik" status={status?.services?.traefik?.status || 'unknown'} metrics={status?.services?.traefik?.metrics || undefined} />
              <StatusCard
                title="Application"
                status={status?.services?.app?.status || 'unknown'}
                metrics={{
                  used: status?.services?.app?.metrics?.memory?.used,
                  total: status?.services?.app?.metrics?.memory?.total,
                  free: status?.services?.app?.metrics?.memory?.free,
                }}
                uptime={status?.services?.app?.metrics?.uptime}
              />
            </div>
          </section>

          <section aria-labelledby="resources-title" className="space-y-4">
            <h2 id="resources-title" className="flex items-center gap-2.5 text-lg font-semibold"><Server aria-hidden="true" className="h-5 w-5 text-muted-foreground" />System resources</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatusCard
                title="Memory"
                status={status?.system ? 'healthy' : 'unknown'}
                metrics={{ used: status?.system?.memory?.used, total: status?.system?.memory?.total, free: status?.system?.memory?.free }}
                uptime={status?.system?.uptime}
              />
              <StatusCard
                title="Disk"
                resourceLabel="Disk"
                status={status?.system ? 'info' : 'unknown'}
                metrics={{ used: status?.system?.disk?.used, total: status?.system?.disk?.total, free: status?.system?.disk?.free }}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
