"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { useAppStore } from "@/lib/store";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, profile } = useAppStore();

  useEffect(() => {
    if (hydrated && !profile) router.replace("/");
  }, [hydrated, profile, router]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return <AppShell>{children}</AppShell>;
}
