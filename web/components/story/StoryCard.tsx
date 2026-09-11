"use client";

import { Bookmark, CheckCircle2, EyeOff, FileText, Pin, Plus } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import type { RelevanceResult, Story } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const STATE_LABEL: Record<Story["state"], string> = {
  breaking: "Breaking",
  active: "Actively developing",
  slow: "Slow-moving",
  dormant: "Dormant",
  resolved: "Resolved",
};

const STATE_TONE: Record<Story["state"], "rose" | "emerald" | "amber" | "neutral" | "indigo"> = {
  breaking: "rose",
  active: "emerald",
  slow: "amber",
  dormant: "neutral",
  resolved: "indigo",
};

export function StoryCard({
  story,
  relevance,
  isFollowing,
  onFollow,
  onNotInterested,
  isBookmarked,
  onToggleBookmark,
  isPinned,
  onTogglePin,
}: {
  story: Story;
  relevance: RelevanceResult;
  isFollowing: boolean;
  onFollow: () => void;
  onNotInterested: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}) {
  const latestEvent = story.timeline[story.timeline.length - 1];
  const primaryCount = story.sources.filter((s) => s.isPrimary).length;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <Tag tone={STATE_TONE[story.state]}>{STATE_LABEL[story.state]}</Tag>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-xs text-slate-400">{formatRelativeTime(story.updatedAt)}</span>
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              aria-label={isPinned ? "Unpin" : "Pin to top"}
              title={isPinned ? "Unpin" : "Pin to top"}
              className={isPinned ? "text-indigo-600 dark:text-indigo-400" : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"}
            >
              <Pin className="h-3.5 w-3.5" fill={isPinned ? "currentColor" : "none"} />
            </button>
          )}
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
              className={isBookmarked ? "text-amber-500" : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"}
            >
              <Bookmark className="h-3.5 w-3.5" fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      <Link href={`/story/${story.id}`} className="mt-3 block">
        <h3 className="text-lg font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
          {story.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{story.currentState}</p>
      </Link>

      {relevance.topReasons.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Why:</span>
          {relevance.topReasons.slice(0, 2).map((reason) => (
            <Tag key={reason} tone="indigo" className="text-[11px]">
              {reason}
            </Tag>
          ))}
        </div>
      )}

      {latestEvent && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">Latest: </span>
          {latestEvent.title}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          {story.sources.length} sources · {primaryCount} primary
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNotInterested}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Not interested
          </button>
          <button
            onClick={onFollow}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isFollowing
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {isFollowing ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Following
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Follow
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
