import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface StatusCardProps {
  title: string;
  status: string;
  metrics?: {
    memory?: number;
    memoryLimit?: number;
    cpu?: number;
    used?: number;
    total?: number;
    free?: number;
  };
  uptime?: number;
  resourceLabel?: string;
}

export function StatusCard({ title, status, metrics, uptime, resourceLabel = "Memory" }: StatusCardProps) {
  const getStatusMeta = () => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle2, label: "Healthy", className: "text-success" };
      case 'unhealthy':
        return { icon: XCircle, label: "Unhealthy", className: "text-destructive" };
      case 'info':
        return { icon: AlertCircle, label: "Info", className: "text-muted-foreground" };
      default:
        return { icon: AlertCircle, label: !status || status === 'unknown' ? "Unknown" : status, className: "text-muted-foreground" };
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMemorySize = (bytes: number) => {
    const tb = bytes / (1024 * 1024 * 1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const used = metrics?.memory ?? metrics?.used;
  const total = metrics?.memoryLimit ?? metrics?.total;
  const hasUsage = typeof used === "number" && Number.isFinite(used);
  const hasTotal = typeof total === "number" && Number.isFinite(total) && total > 0;
  const usage = hasUsage && hasTotal ? Math.max(0, used / total * 100) : null;
  const statusMeta = getStatusMeta();
  const StatusIcon = statusMeta.icon;
  const cpu = metrics?.cpu;
  const hasCpu = typeof cpu === "number" && Number.isFinite(cpu);

  return (
    <Card className="h-full rounded-xl shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-5 pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", statusMeta.className)}>
          <StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />
          {statusMeta.label}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
          {hasUsage ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{resourceLabel} usage</p>
              <p className="tabular flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono">
                <span className="text-2xl font-semibold tracking-tight">{formatMemorySize(used)}</span>
                {hasTotal && <span className="text-xs text-muted-foreground">/ {formatMemorySize(total)}</span>}
              </p>
              {usage !== null && (
                <div className="space-y-2">
                <Progress
                  value={Math.min(100, usage)}
                  aria-label={title === resourceLabel ? `${title} usage` : `${title} ${resourceLabel.toLowerCase()} usage`}
                  aria-valuetext={`${usage.toFixed(1)}% used`}
                  className={cn("h-2 bg-muted", usage > 90 ? "[&>div]:bg-destructive" : usage > 70 ? "[&>div]:bg-warning" : "[&>div]:bg-success")}
                />
                <p className="tabular text-right font-mono text-xs text-muted-foreground">{usage.toFixed(1)}% used</p>
                </div>
              )}
            </div>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">No resource metrics reported.</p>
          )}
          {(hasCpu || uptime !== undefined) && (
            <dl className="flex flex-wrap justify-between gap-3 border-t pt-4 text-xs">
              {hasCpu && <div><dt className="text-muted-foreground">CPU</dt><dd className="tabular mt-1 font-mono">{cpu === 0 ? '0' : cpu < 0.1 ? '< 0.1' : cpu.toFixed(1)}%</dd></div>}
              {uptime !== undefined && <div><dt className="text-muted-foreground">Uptime</dt><dd className="tabular mt-1 font-mono">{formatUptime(uptime)}</dd></div>}
            </dl>
          )}
      </CardContent>
    </Card>
  );
} 
