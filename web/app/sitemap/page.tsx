"use client";

import {
  ArrowRight,
  Compass,
  GitBranch,
  Home,
  ListChecks,
  MessageCircle,
  Rss,
  Settings,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STORIES } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

const PUBLIC_PAGES = [
  { href: "/", label: "Landing", icon: Home, note: "Product pitch and entry point." },
  { href: "/register", label: "Register", icon: UserPlus, note: "Step 1 — create a profile." },
  { href: "/onboarding", label: "Onboarding", icon: ListChecks, note: "Step 2 — hobbies, interests, sports, movies, politics." },
];

const APP_PAGES = [
  { href: "/discover", label: "Discover", icon: Compass, note: "Step 5/6 — ranked, explainable story feed." },
  { href: "/following", label: "Following", icon: Rss, note: "Active subscriptions and cadence." },
  { href: "/chat", label: "Chat", icon: MessageCircle, note: "Step 4 — interest extraction with confidence." },
  { href: "/constellation", label: "Constellation", icon: GitBranch, note: "Step 3 — your personal relevance graph." },
  { href: "/settings", label: "Settings", icon: Settings, note: "Step 10 — notifications, privacy, export/delete." },
];

export default function SitemapPage() {
  const router = useRouter();
  const { hydrated, profile, startGuestExploration } = useAppStore();
  const needsGuestSession = hydrated && !profile;

  const handleStartGuest = () => {
    startGuestExploration();
    router.push("/discover");
  };

  const totalPages = PUBLIC_PAGES.length + APP_PAGES.length + STORIES.length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-slate-900 dark:text-white">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <span className="text-lg font-semibold">SignalArc</span>
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">All pages</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {totalPages} pages total — {PUBLIC_PAGES.length} public, {APP_PAGES.length} in the
        signed-in app shell, plus {STORIES.length} individual story pages under the dynamic{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">/story/[id]</code> route.
      </p>

      {needsGuestSession && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <p className="text-sm text-indigo-800 dark:text-indigo-300">
            The links below need a profile to render (they show your personal relevance graph).
            Start a demo session to make every link below live, with no registration required.
          </p>
          <button
            onClick={handleStartGuest}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Start demo session
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Public</h2>
        <PageList pages={PUBLIC_PAGES} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Signed-in app {needsGuestSession && <span className="normal-case text-slate-400">(needs a profile — see above)</span>}
        </h2>
        <PageList pages={APP_PAGES} disabled={needsGuestSession} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Story pages ({STORIES.length}){needsGuestSession && <span className="normal-case text-slate-400"> — needs a profile</span>}
        </h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {STORIES.map((story) =>
            needsGuestSession ? (
              <div key={story.id} className="flex items-center justify-between gap-3 px-4 py-3 opacity-50">
                <span className="text-sm text-slate-500 dark:text-slate-400">{story.title}</span>
                <code className="shrink-0 text-xs text-slate-400">/story/{story.id}</code>
              </div>
            ) : (
              <Link
                key={story.id}
                href={`/story/${story.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{story.title}</span>
                <code className="shrink-0 text-xs text-slate-400">/story/{story.id}</code>
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function PageList({
  pages,
  disabled = false,
}: {
  pages: { href: string; label: string; icon: typeof Home; note: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {pages.map((page) =>
        disabled ? (
          <div key={page.href} className="flex items-center gap-3 px-4 py-3 opacity-50">
            <page.icon className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{page.label}</p>
              <p className="truncate text-xs text-slate-400">{page.note}</p>
            </div>
            <code className="shrink-0 text-xs text-slate-400">{page.href}</code>
          </div>
        ) : (
          <Link
            key={page.href}
            href={page.href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <page.icon className="h-4 w-4 shrink-0 text-indigo-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{page.label}</p>
              <p className="truncate text-xs text-slate-400">{page.note}</p>
            </div>
            <code className="shrink-0 text-xs text-slate-400">{page.href}</code>
          </Link>
        )
      )}
    </div>
  );
}
