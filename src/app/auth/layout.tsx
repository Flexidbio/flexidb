import Link from "next/link";
import { Layers } from "lucide-react";

const ENGINES = [
  { name: "PostgreSQL", port: "5432" },
  { name: "MySQL", port: "3306" },
  { name: "MongoDB", port: "27017" },
  { name: "Redis", port: "6379" },
  { name: "MariaDB", port: "3306" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — carries the control-plane identity */}
      <aside className="relative hidden overflow-hidden bg-[hsl(227_38%_6%)] p-10 text-[hsl(228_30%_95%)] lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 30% 20%, #000 40%, transparent 80%)",
          }}
          aria-hidden
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(172_63%_52%)]/15 ring-1 ring-[hsl(172_63%_52%)]/30">
            <Layers className="h-4 w-4 text-[hsl(172_63%_52%)]" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">FlexiDB</span>
        </Link>

        <div className="relative">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[hsl(172_63%_52%)]">
            Self-hosted control plane
          </p>
          <p className="max-w-md font-display text-3xl font-semibold leading-tight tracking-tight">
            Your databases.
            <span className="block text-[hsl(226_15%_62%)]">Your hardware.</span>
          </p>
          <div className="mt-8 space-y-1.5">
            {ENGINES.map((e) => (
              <div
                key={e.name + e.port}
                className="flex items-center justify-between border-b border-white/5 py-1.5 font-mono text-[13px]"
              >
                <span className="text-[hsl(228_30%_88%)]">{e.name}</span>
                <span className="text-[hsl(226_15%_62%)]">:{e.port}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-xs text-[hsl(226_15%_62%)]">
          No cloud bill · no lock-in
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[360px]">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/12 ring-1 ring-primary/25">
              <Layers className="h-4 w-4 text-primary" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">FlexiDB</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
