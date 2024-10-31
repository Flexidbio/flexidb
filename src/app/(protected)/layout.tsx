import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    const currentPath = "/dashboard"; // You can make this dynamic if needed
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64 border-r" />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}