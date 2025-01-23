"use client"

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { headers } from 'next/headers';
import { UpdateNotification } from "@/components/update-notification";
import { useUpdateCheck } from "@/hooks/use-update-check";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentVersion } = useUpdateCheck();

  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64 border-r" />
      {currentVersion && (
        <UpdateNotification />
      )}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}