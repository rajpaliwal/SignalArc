"use client";

import {
  Compass,
  GitBranch,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Rss,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/following", label: "Following", icon: Rss },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/constellation", label: "Constellation", icon: GitBranch },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/sitemap", label: "All pages", icon: LayoutGrid },
];

/**
 * The one top nav bar used everywhere — inside the signed-in app shell and
 * on the landing page. Shows the full menu + avatar when there's a profile
 * (guest or real), or just a login link when there isn't.
 */
export function TopNav() {
  const pathname = usePathname();
  const { hydrated, profile, resetAll } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasProfile = hydrated && !!profile;

  const handleSignOut = () => {
    // Clearing the profile is enough on protected pages — the (app) layout
    // guard redirects to /register on its own. On the landing page there's
    // no such guard, so this just leaves you on / with a logged-out header.
    resetAll();
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={hasProfile ? "/discover" : "/"}
          className="flex shrink-0 items-center gap-2 text-slate-900 dark:text-white"
        >
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="text-base font-semibold">SignalArc</span>
        </Link>

        {hasProfile ? (
          <>
            <nav className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {profile?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:inline">{profile?.name}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{profile?.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out &amp; clear data
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
