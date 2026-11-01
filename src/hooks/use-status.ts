import { useEffect, useState, useRef, useCallback } from 'react';

export interface SystemStatus {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: {
      status: string;
      latency: number;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    traefik: {
      status: string;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    app: {
      status: string;
      metrics: {
        memory: {
          total: number;
          used: number;
          free: number;
        };
        uptime: number;
      };
    };
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
  };
}

export function useStatus(options = { enabled: true }) {
  const [data, setData] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!options.enabled || !mountedRef.current) return

    try {
      const es = new EventSource('/api/health/stream')
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.error) {
            setIsError(true)
          } else {
            setData(parsed)
            setIsError(false)
            setIsLoading(false)
          }
        } catch {
          setIsError(true)
        }
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        setIsError(true)
        setIsLoading(false)

        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 10000)
        }
      }
    } catch {
      setIsError(true)
      setIsLoading(false)
    }
  }, [options.enabled])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Failed to fetch')
      const parsed = await response.json()
      setData(parsed)
      setIsError(false)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connect])

  return { data, isLoading, isError, refetch }
}
