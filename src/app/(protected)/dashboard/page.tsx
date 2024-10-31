import { Metadata } from "next";
import { DatabaseList } from "@/components/database/database-list";
import { auth } from "@/lib/auth/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your databases",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}</h1>
        <p className="text-muted-foreground">
          Manage your database instances below
        </p>
      </div>
      <DatabaseList />
    </div>
  );
}
