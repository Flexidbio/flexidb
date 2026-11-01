import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { headers } from 'next/headers';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    const headersList = await headers();
    const currentPath = headersList.get("x-invoke-path") || "/dashboard";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background lg:flex-row">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-card px-4 py-3 text-sm font-medium shadow-lg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring">
        Skip to content
      </a>
      <Sidebar className="w-64 shrink-0" user={session.user} />
      <main id="main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 outline-none sm:p-6 lg:p-8 xl:p-10">
        {children}
      </main>
    </div>
  );
}
