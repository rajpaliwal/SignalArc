"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConstellationGraph } from "@/components/constellation/ConstellationGraph";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { api, ApiError } from "@/lib/api";
import { getStoryById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { InterestEdge, InterestType } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const TYPE_TONE: Record<InterestType, "indigo" | "amber" | "neutral" | "teal" | "violet"> = {
  topic: "indigo",
  place: "amber",
  profession: "neutral",
  hobby: "teal",
  sport: "teal",
  movie: "violet",
  political: "indigo",
  other: "neutral",
};

export default function ConstellationPage() {
  const router = useRouter();
  const {
    profile,
    isGuest,
    authToken,
    interests,
    removeInterest,
    setConstellationData,
    implicitLearningEnabled,
    setImplicitLearningEnabled,
    subscriptions,
    followedStoryStubs,
  } = useAppStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Guest sessions have no backend graph to fetch — keep the locally
    // seeded demo data exactly as before. Real accounts fetch live from
    // Neo4j on every visit, which is what actually fixes interests
    // appearing to vanish after logging back in — they were never gone,
    // the frontend just never asked for them again after login.
    if (isGuest || !authToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below, not a synchronization loop
    setLoading(true);
    api
      .getConstellation(authToken)
      .then(({ user, interests, followed_stories }) => setConstellationData(user, interests, followed_stories))
      .catch((err) => showToast(err instanceof ApiError ? err.message : "Couldn't load your constellation.", "info"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, authToken]);

  // Guests have no backend graph — keep the local mock-story demo. Real
  // accounts show the actual `User-[:FOLLOWS]->Story` edges fetched above,
  // which is what makes this ring reflect real follows instead of nothing
  // (mock story ids never existed as real backend stories to look up).
  const followedStories = isGuest
    ? subscriptions
        .filter((s) => s.status === "following")
        .map((s) => getStoryById(s.storyId))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({ id: s.id, title: s.title }))
    : followedStoryStubs.map((s) => ({ id: s.id, title: s.title }));

  const sorted = [...interests].sort((a, b) => {
    const strengthA = a.explicitWeight + a.implicitWeight * a.confidence - a.negativeWeight;
    const strengthB = b.explicitWeight + b.implicitWeight * b.confidence - b.negativeWeight;
    return strengthB - strengthA;
  });

  const handleSelectInterest = (id: string) => {
    setSelectedId(id);
    document.getElementById(`interest-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Your constellation</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            The relevance profile that powers your Discover feed — inspect, edit or remove any
            connection. Nothing here is hidden from you. Hover a node for details, click to
            select it below, and use the controls (or scroll) to zoom.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <input
            type="checkbox"
            checked={implicitLearningEnabled}
            onChange={(e) => {
              setImplicitLearningEnabled(e.target.checked);
              showToast(e.target.checked ? "Learning from conversations enabled." : "Learning from conversations disabled.", "info");
            }}
            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Learn from my conversations
        </label>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#0b0f1f] p-2 shadow-sm shadow-slate-900/[0.03] dark:border-slate-800">
        {loading && (
          <div className="absolute inset-2 z-10 flex items-center justify-center rounded-xl bg-[#0b0f1f]/70 backdrop-blur-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          </div>
        )}
        {/* A fixed height (not aspect-square + max-height) — WebKit has a real
            bug where `aspect-ratio` combined with `max-height` fails to clamp
            before percentage-height descendants (`h-full`) resolve, so those
            descendants inherit the *unclamped* square height instead of the
            capped one. A plain fixed height has no such ambiguity in any engine. */}
        <div className="h-[420px] w-full overflow-hidden sm:h-[500px] lg:h-[560px]">
          <ConstellationGraph
            centerLabel={profile?.name ?? "You"}
            edges={interests}
            followedStories={followedStories}
            selectedId={selectedId}
            onSelectInterest={handleSelectInterest}
            onSelectStory={(id) => router.push(`/story/${id}`)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        <LegendDot color="#6366f1" label="Topics / political" />
        <LegendDot color="#14b8a6" label="Hobbies / sports" />
        <LegendDot color="#f59e0b" label="Places" />
        <LegendDot color="#8b5cf6" label="Movies & entertainment" />
        <LegendDot color="#f97316" label="Followed stories" />
        <span>Solid line = explicit · dashed = inferred from chat</span>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold text-slate-900 dark:text-white">All connections</h2>
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        {sorted.length === 0 && <p className="p-5 text-sm text-slate-400">No connections yet — complete onboarding or chat to build your graph.</p>}
        {sorted.map((edge) => (
          <InterestRow
            key={edge.id}
            edge={edge}
            selected={edge.id === selectedId}
            onRemove={() => removeInterest(edge.id)}
            onClick={() => setSelectedId(edge.id)}
          />
        ))}
      </Card>
    </div>
  );
}

function InterestRow({
  edge,
  selected,
  onRemove,
  onClick,
}: {
  edge: InterestEdge;
  selected: boolean;
  onRemove: () => void;
  onClick: () => void;
}) {
  const strength = Math.max(0, edge.explicitWeight + edge.implicitWeight * edge.confidence - edge.negativeWeight);
  return (
    <div
      id={`interest-row-${edge.id}`}
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-between gap-4 px-5 py-3.5 transition-colors ${
        selected ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{edge.label}</span>
          <Tag tone={TYPE_TONE[edge.type]}>{edge.type}</Tag>
          <Tag tone={edge.source === "explicit" ? "neutral" : "violet"}>{edge.source}</Tag>
          {edge.negativeWeight > 0 && <Tag tone="rose">muted</Tag>}
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">
          {edge.reason} · reinforced {formatRelativeTime(edge.lastReinforcedAt)}
        </p>
        <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${edge.negativeWeight > 0 ? "bg-rose-400" : "bg-indigo-500"}`}
            style={{ width: `${Math.min(100, strength * 100)}%` }}
          />
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
        aria-label={`Remove ${edge.label}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
