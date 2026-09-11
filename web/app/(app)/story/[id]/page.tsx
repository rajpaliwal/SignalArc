"use client";

import { Bookmark, ChevronDown, Clock, EyeOff, FileText, Pin, Plus, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnalysisPanel } from "@/components/story/AnalysisPanel";
import { EvidencePanel } from "@/components/story/EvidencePanel";
import { RelevanceExplain } from "@/components/story/RelevanceExplain";
import { TimelineList } from "@/components/story/TimelineList";
import { WhatIfPanel } from "@/components/story/WhatIfPanel";
import { Tag } from "@/components/ui/Tag";
import { api, apiStoryToStory } from "@/lib/api";
import { getStoryById } from "@/lib/mock-data";
import { computeRelevance } from "@/lib/relevance";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { Cadence, Story } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const BASE_TABS = ["Timeline", "Evidence & sources", "What-if", "Analysis"] as const;
type Tab = (typeof BASE_TABS)[number] | "Cause";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "breaking", label: "Every 15-30 min" },
  { value: "active", label: "Every 1-3 hours" },
  { value: "slow", label: "2-4x daily" },
  { value: "dormant", label: "Daily" },
];

const STATE_LABEL: Record<string, string> = {
  breaking: "Breaking",
  active: "Actively developing",
  slow: "Slow-moving",
  dormant: "Dormant",
  resolved: "Resolved",
};

const STATE_TONE: Record<string, "rose" | "emerald" | "amber" | "neutral" | "indigo"> = {
  breaking: "rose",
  active: "emerald",
  slow: "amber",
  dormant: "neutral",
  resolved: "indigo",
};

export default function StoryPage() {
  const params = useParams<{ id: string }>();
  const mockStory = getStoryById(params.id);
  const {
    profile,
    isGuest,
    authToken,
    interests,
    follow,
    unfollow,
    getSubscription,
    setCadence,
    addFeedback,
    addNegativeSignal,
    whatIfHistory,
    addWhatIf,
    isBookmarked,
    toggleBookmark,
    isPinned,
    togglePin,
  } = useAppStore();
  const { showToast } = useToast();
  const [remoteStory, setRemoteStory] = useState<Story | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("Timeline");
  const [whyOpen, setWhyOpen] = useState(false);
  const [cadenceOpen, setCadenceOpen] = useState(false);

  // Real (non-mock) stories are fetched from the backend by id — the mock
  // fixtures cover the demo/guest experience, everything else is live data
  // from the news pipeline (see api/app/news/sync.py).
  useEffect(() => {
    if (mockStory || isGuest || !authToken) return;
    setRemoteLoading(true);
    api
      .getStory(params.id, authToken)
      .then((s) => setRemoteStory(apiStoryToStory(s)))
      .catch(() => setRemoteStory(null))
      .finally(() => setRemoteLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, mockStory, isGuest, authToken]);

  const story = mockStory ?? remoteStory;
  const isRemote = !mockStory && !!remoteStory;
  const TABS = story?.cause ? (["Timeline", "Cause", "Evidence & sources", "What-if", "Analysis"] as const) : BASE_TABS;

  const subscription = story ? getSubscription(story.id) : undefined;
  const isFollowing = subscription?.status === "following";

  const relevance = useMemo(
    () => (story ? computeRelevance(story, profile, interests, isFollowing) : null),
    [story, profile, interests, isFollowing]
  );

  // The Analysis/What-if tabs are the expensive, LLM-heavy part — fetched
  // only once a reader actually opens one of them, never preloaded (see
  // GET /discover/stories/{id}/analysis, cached server-side after the first
  // real computation).
  const [lazyAnalysis, setLazyAnalysis] = useState<Story["analysis"] | null>(null);
  const [lazyWhatIfSeeds, setLazyWhatIfSeeds] = useState<Story["whatIfSeeds"] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    if (!(tab === "Analysis" || tab === "What-if") || !isRemote || !authToken || lazyAnalysis || !story) return;
    setAnalysisLoading(true);
    api
      .getAnalysis(story.id, authToken)
      .then((a) => {
        setLazyAnalysis({ summary: story.summary, keyDrivers: a.key_drivers, risks: a.risks, outlook: a.outlook });
        setLazyWhatIfSeeds(a.what_if_seeds.map((q) => ({ question: q, assumptions: [], scenario: "", confidence: "medium" as const })));
      })
      .catch(() => {})
      .finally(() => setAnalysisLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isRemote, authToken, story, lazyAnalysis]);

  const displayStory = story && lazyAnalysis ? { ...story, analysis: lazyAnalysis, whatIfSeeds: lazyWhatIfSeeds ?? story.whatIfSeeds } : story;

  if (!story && remoteLoading) {
    return <div className="p-12 text-center text-sm text-slate-400">Loading story…</div>;
  }

  if (!story || !relevance) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">Story not found.</p>
        <Link href="/discover" className="mt-2 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Back to Discover
        </Link>
      </div>
    );
  }

  const handleFollowToggle = (cadence?: Cadence) => {
    const nowFollowing = !isFollowing;
    if (nowFollowing) {
      follow(story.id, cadence ?? "active");
      showToast("Following — you'll be notified on material changes.");
    } else {
      unfollow(story.id);
      showToast("Unfollowed story.", "info");
    }
    setCadenceOpen(false);
    // Follow/unfollow is itself a relevance signal — reinforces the matching
    // interest and updates the graph server-side (see api/app/routers/discover.py).
    if (isRemote && authToken) api.setFollow(story.id, nowFollowing, authToken).catch(() => {});
  };

  const handleNotInterested = () => {
    const topic = story.topics[0] ?? story.title;
    addFeedback({ scope: "story", targetId: story.id, targetLabel: topic, sentiment: "negative" });
    addNegativeSignal(topic, "topic", `Marked "${story.title}" as not interesting`);
    showToast("Got it — you'll see less like this.", "info");
  };

  const latestEvent = story.timeline[story.timeline.length - 1];

  return (
    <div>
      <Link href="/discover" className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        ← Back to Discover
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag tone={STATE_TONE[story.state]}>{STATE_LABEL[story.state]}</Tag>
            <span className="text-xs text-slate-400">
              {story.sources.length} sources · updated {formatRelativeTime(story.updatedAt)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{story.title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => togglePin(story.id)}
            aria-label={isPinned(story.id) ? "Unpin" : "Pin to top"}
            title={isPinned(story.id) ? "Unpin" : "Pin to top"}
            className={`rounded-lg p-2 ${isPinned(story.id) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"}`}
          >
            <Pin className="h-4 w-4" fill={isPinned(story.id) ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => toggleBookmark(story.id)}
            aria-label={isBookmarked(story.id) ? "Remove bookmark" : "Bookmark"}
            title={isBookmarked(story.id) ? "Remove bookmark" : "Bookmark"}
            className={`rounded-lg p-2 ${isBookmarked(story.id) ? "text-amber-500" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"}`}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked(story.id) ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleNotInterested}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Not interested
          </button>

          <button
            onClick={() => handleFollowToggle()}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isFollowing
                ? "bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {isFollowing ? (
              <>
                <X className="h-4 w-4" />
                Unfollow
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Follow
              </>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setCadenceOpen((v) => !v)}
              aria-label="Check for updates"
              title={isFollowing ? `Checking ${subscription?.cadence}` : "Check for updates"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Clock className="h-4 w-4" />
            </button>
            {cadenceOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCadenceOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400">Check for updates</p>
                  {CADENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        isFollowing ? setCadence(story.id, opt.value) : handleFollowToggle(opt.value);
                        setCadenceOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        subscription?.cadence === opt.value
                          ? "font-semibold text-indigo-600 dark:text-indigo-400"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{story.currentState}</p>

      {latestEvent && (
        <div className="mt-3 flex max-w-3xl items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p className="text-indigo-800 dark:text-indigo-300">
            <span className="font-medium">What changed: </span>
            {latestEvent.title}
          </p>
        </div>
      )}

      <button
        onClick={() => setWhyOpen((v) => !v)}
        className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
        Why am I seeing this?
      </button>
      {whyOpen && (
        <div className="mt-3 max-w-md rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <RelevanceExplain relevance={relevance} />
        </div>
      )}

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        {tab === "Timeline" && <TimelineList events={story.timeline} sources={story.sources} />}
        {tab === "Cause" && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">How it started</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{story.cause}</p>
          </section>
        )}
        {tab === "Evidence & sources" && <EvidencePanel story={story} />}
        {tab === "What-if" && (
          <WhatIfPanel
            story={displayStory ?? story}
            history={whatIfHistory[story.id] ?? []}
            onAsk={(ex) => addWhatIf(story.id, ex)}
            predict={isRemote && authToken ? (q) => api.askWhatIf(story.id, q, authToken) : undefined}
          />
        )}
        {tab === "Analysis" &&
          (analysisLoading && !lazyAnalysis ? (
            <p className="text-sm text-slate-400">Analyzing…</p>
          ) : (
            <AnalysisPanel story={displayStory ?? story} />
          ))}
      </div>
    </div>
  );
}
