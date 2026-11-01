'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Database, Plus, RefreshCw, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatabaseCard } from "@/components/database/database-card";
import { getDatabaseEngine } from "@/components/database/database-ui";
import { getDatabasesAction } from "@/lib/actions/database";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

export function DatabaseListSkeleton() {
  return (
    <div role="status" aria-label="Loading databases" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} aria-hidden="true" className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-24 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="mt-5 h-6 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
          <div className="mt-5 h-12 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="mt-5 h-9 rounded-lg bg-muted motion-safe:animate-pulse" />
        </div>
      ))}
      <span className="sr-only">Loading your database instances.</span>
    </div>
  );
}

export function DatabaseList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [engineFilter, setEngineFilter] = useState("all");
  
  const { data: databases, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      try {
        const result = await getDatabasesAction();
        return result;
      } catch (error) {
        toast.error("Failed to fetch databases");
        throw error;
      }
    },
    retry: 1
  });

  const instances = databases ?? [];
  const isStopped = (status: string) => ["stopped", "exited"].includes(status.toLowerCase());
  const filters = [
    { value: "all", label: "All", count: instances.length },
    { value: "running", label: "Live", count: instances.filter(db => db.status.toLowerCase() === "running").length },
    { value: "stopped", label: "Stopped", count: instances.filter(db => isStopped(db.status)).length },
  ];
  const engines = Array.from(new Set(instances.map(db => getDatabaseEngine(db.type).label))).sort();
  const query = search.trim().toLowerCase();
  const filteredDatabases = instances.filter(db => {
    const matchesSearch = [db.name, db.type, getDatabaseEngine(db.type).label, String(db.port), String(db.internalPort)]
      .some(value => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || (statusFilter === "stopped" ? isStopped(db.status) : db.status.toLowerCase() === statusFilter);
    const matchesEngine = engineFilter === "all" || getDatabaseEngine(db.type).label === engineFilter;
    return matchesSearch && matchesStatus && matchesEngine;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setEngineFilter("all");
  };

  return (
    <section aria-labelledby="database-list-title" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="database-list-title" className="text-lg font-semibold">Your databases</h2>
        <Button variant="ghost" size="sm" className="h-10 gap-2 text-muted-foreground" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw aria-hidden="true" className={cn("h-4 w-4", isFetching && "motion-safe:animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="database-search" className="sr-only">Search databases by name, engine, or port</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="database-search" type="search" placeholder="Search databases…" value={search} onChange={event => setSearch(event.target.value)} className="h-11 bg-card pl-10" disabled={isLoading} />
        </div>
        <Select value={engineFilter} onValueChange={setEngineFilter} disabled={isLoading}>
          <SelectTrigger className="h-11 bg-card sm:w-44" aria-label="Filter by database engine">
            <SelectValue placeholder="All engines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All engines</SelectItem>
            {engines.map(engine => <SelectItem key={engine} value={engine}>{engine}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by database status" className="flex flex-wrap gap-1">
          {filters.map(filter => (
            <Button
              key={filter.value}
              variant="ghost"
              size="sm"
              aria-pressed={statusFilter === filter.value}
              disabled={isLoading}
              onClick={() => setStatusFilter(filter.value)}
              className={cn("h-10 gap-2 rounded-lg px-3 text-muted-foreground", statusFilter === filter.value && "bg-accent font-medium text-foreground")}
            >
              {filter.label}
              <span className="tabular text-xs text-muted-foreground">{isLoading ? "—" : filter.count}</span>
            </Button>
          ))}
        </div>
        {!isLoading && !error && (
          <p role="status" className="text-xs text-muted-foreground">
            {filteredDatabases.length === instances.length ? `${instances.length} ${instances.length === 1 ? "instance" : "instances"}` : `${filteredDatabases.length} of ${instances.length} instances`}
          </p>
        )}
      </div>

      {isLoading ? (
        <DatabaseListSkeleton />
      ) : error ? (
        <div role="alert" className="flex flex-col items-center rounded-xl border bg-card px-6 py-14 text-center">
          <AlertCircle aria-hidden="true" className="h-8 w-8 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load databases</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Your instances couldn&apos;t be loaded. Try refreshing the list.</p>
          <Button variant="outline" disabled={isFetching} onClick={() => refetch()} className="mt-5 gap-2">
            <RefreshCw aria-hidden="true" className={cn("h-4 w-4", isFetching && "motion-safe:animate-spin")} />
            Retry
          </Button>
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <Database aria-hidden="true" className="h-9 w-9 text-primary" />
          <h3 className="mt-5 text-xl font-semibold">No databases yet</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Spin up your first Postgres, MySQL, MongoDB, Redis, or MariaDB instance to get a connection string.</p>
          <Button asChild className="mt-6 h-11 gap-2">
            <Link href="/dashboard/database/create">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create your first database
            </Link>
          </Button>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-14 text-center">
          <SearchX aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No matching databases</h3>
          <p className="mt-2 text-sm text-muted-foreground">Try another search or clear your filters to see all instances.</p>
          <Button variant="outline" className="mt-5" onClick={clearFilters}>Clear filters</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDatabases.map(database => <DatabaseCard key={database.id} database={database} />)}
        </div>
      )}
    </section>
  );
}
