import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';

export async function AuthWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  if (!session?.user) {
    const headersList = headers();
    const currentPath = headersList.get("x-invoke-path") || "/dashboard";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return children;
} 