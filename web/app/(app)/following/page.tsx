"use client";

import { Compass, Pause, Play, X } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { getStoryById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { Cadence } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "breaking", label: "Every 15-30 min" },
  { value: "active", label: "Every 1-3 hours" },
  { value: "slow", label: "2-4x daily" },
  { value: "dormant", label: "Daily" },
];

export default function FollowingPage() {
  const { subscriptions, setCadence, toggleSubscriptionStatus, unfollow } = useAppStore();
  const { showToast } = useToast();

  const items = subscriptions
    .map((sub) => ({ sub, story: getStoryById(sub.storyId) }))
    .filter((item): item is { sub: (typeof subscriptions)[number]; story: NonNullable<ReturnType<typeof getStoryById>> } => !!item.story);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Following</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Active subscriptions, monitoring cadence and status. You&apos;ll only be notified when a
          followed story materially changes.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">You&apos;re not following any stories yet.</p>
          <Link
            href="/discover"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            <Compass className="h-4 w-4" />
            Head to Discover
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ sub, story }) => (
            <Card key={sub.storyId} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/story/${story.id}`}
                    className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {story.title}
                  </Link>
                  <Tag tone={sub.status === "following" ? "emerald" : "neutral"}>
                    {sub.status === "following" ? "Active" : "Paused"}
                  </Tag>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Last update {formatRelativeTime(story.updatedAt)} · Following since{" "}
                  {formatRelativeTime(sub.followedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={sub.cadence}
                  onChange={(e) => setCadence(story.id, e.target.value as Cadence)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {CADENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    toggleSubscriptionStatus(story.id);
                    showToast(sub.status === "following" ? "Paused." : "Resumed.", "info");
                  }}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  )}
                  aria-label={sub.status === "following" ? "Pause" : "Resume"}
                >
                  {sub.status === "following" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    unfollow(story.id);
                    showToast("Unfollowed.", "info");
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-500/10"
                  aria-label="Unfollow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
