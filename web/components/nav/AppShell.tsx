"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isGuest } = useAppStore();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <TopNav />

      {isGuest && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:px-6">
          You&apos;re exploring with a seeded demo profile — nothing is tied to a real account.{" "}
          <Link href="/register" className="font-semibold underline underline-offset-2">
            Create a real profile
          </Link>{" "}
          to start from scratch with your own interests.
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
