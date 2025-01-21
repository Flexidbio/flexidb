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
    const headersList = headers();
    const currentPath = headersList.get("x-invoke-path") || "/dashboard";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64 border-r" user={session.user} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}