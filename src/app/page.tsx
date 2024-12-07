// app/page.tsx
import { auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to FlexiDB</h1>
          <p className="text-muted-foreground">
            Sign in to manage your databases
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
