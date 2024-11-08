'use client';
import { AwaitedReactNode, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContainerLogs } from "@/hooks/use-docker";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LogEntry {
  timestamp: string;
  message: string;
}

interface DatabaseLogsTabProps {
  containerId: string;
}

export function DatabaseLogsTab({ containerId }: DatabaseLogsTabProps) {
  const [isLive, setIsLive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: logs, isLoading, refetch } = useContainerLogs(containerId, isLive);
  // Parse logs into structured format
  const parsedLogs = logs?.logs?.split('\n')
    .filter((line: string) => line.trim())
    .map((line: string) => {
      try {
        const match = line.match(/\[(.*?)\]/);
        const timestamp = match ? match[1] : new Date().toISOString();
        const message = line.replace(/\[.*?\]/, '').trim();
        return { timestamp, message };
      } catch (error) {
        return { timestamp: new Date().toISOString(), message: line };
      }
    }) ?? [];

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Container Logs</CardTitle>
            <CardDescription>
              View logs from your database container
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="live-mode"
                checked={isLive}
                onCheckedChange={setIsLive}
              />
              <Label htmlFor="live-mode">Live Updates</Label>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLive}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea 
          ref={scrollRef}
          className="h-[400px] w-full rounded-md border bg-muted p-4 font-mono"
        >
          {parsedLogs.length > 0 ? (
            <div className="space-y-1">
              {parsedLogs.map((log: { timestamp: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; message: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }, index: Key | null | undefined) => (
                <div key={index} className="text-sm">
                  <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No logs available
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}