"use client";

import { Clock, Hash, Pin, Search, SlidersHorizontal, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { StoryCard } from "@/components/story/StoryCard";
import { Select } from "@/components/ui/Select";
import { api, ApiError, apiStoryToStory } from "@/lib/api";
import { STORIES } from "@/lib/mock-data";
import { scoreAndSortStories } from "@/lib/relevance";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { Cadence, Story } from "@/lib/types";

const DEFAULT_CADENCE: Record<string, Cadence> = {
  breaking: "breaking",
  active: "active",
  slow: "slow",
  dormant: "dormant",
  resolved: "dormant",
};

const BOOKMARKED_VALUE = "__bookmarked__";

// How many stories to fetch — the "variable" a user can tune. -1 tells the
// backend to skip its cached list entirely and actively refresh every one
// of the user's topics live before answering (costs real SERP/LLM calls,
// hence not the default).
const LIMIT_OPTIONS = [
  { value: 5, label: "5 stories" },
  { value: 10, label: "10 stories" },
  { value: 20, label: "20 stories" },
  { value: -1, label: "All — look for developments now" },
];

const TIME_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "24", label: "Updated in last 24h" },
  { value: "168", label: "Updated in last 7 days" },
];

export default function DiscoverPage() {
  const {
    profile,
    isGuest,
    authToken,
    interests,
    subscriptions,
    follow,
    unfollow,
    isFollowing,
    addFeedback,
    addNegativeSignal,
    setConstellationData,
    isBookmarked,
    toggleBookmark,
    isPinned,
    togglePin,
  } = useAppStore();
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [liveStories, setLiveStories] = useState<Story[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [limit, setLimit] = useState(5);
  const [withinHours, setWithinHours] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Story | null>(null);

  const topicOptions = useMemo(() => Array.from(new Set(interests.map((i) => i.label))).sort(), [interests]);

  useEffect(() => {
    // The topic filter reads from the same local `interests` Constellation
    // populates — fetch it here too in case this is the first page visited
    // this session (e.g. straight after login), so the filter isn't empty.
    if (isGuest || !authToken || interests.length > 0) return;
    api
      .getConstellation(authToken)
      .then(({ user, interests, followed_stories }) => setConstellationData(user, interests, followed_stories))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, authToken, interests.length]);

  useEffect(() => {
    // Guests keep the local demo fixtures; real accounts see news fetched
    // live from their own interests (see api/app/news/sync.py), refetched
    // on every visit so newly-clustered stories show up without a reload.
    if (isGuest || !authToken) return;
    setLoading(true);
    api
      .getDiscoverStories(authToken, { limit, withinHours: withinHours ? Number(withinHours) : undefined })
      .then((stories) => setLiveStories(stories.map(apiStoryToStory)))
      .catch((err) => showToast(err instanceof ApiError ? err.message : "Couldn't load your feed.", "info"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, authToken, limit, withinHours]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !authToken || searching) return;
    setSearching(true);
    try {
      const story = apiStoryToStory(await api.searchStory(query.trim(), authToken));
      setSearchResult(story);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't find anything for that.", "info");
    } finally {
      setSearching(false);
    }
  };

  const sourceStories = isGuest ? STORIES : liveStories ?? [];
  const filteredStories =
    topicFilter === BOOKMARKED_VALUE
      ? sourceStories.filter((s) => isBookmarked(s.id))
      : topicFilter
        ? sourceStories.filter((s) => s.topics.some((t) => t.toLowerCase() === topicFilter.toLowerCase()))
        : sourceStories;

  const followedIds = useMemo(() => new Set(subscriptions.filter((s) => s.status === "following").map((s) => s.storyId)), [subscriptions]);

  // Pinned stories always show, at the top, regardless of any filter.
  const pinnedStories = sourceStories.filter((s) => isPinned(s.id));
  const pinnedIds = new Set(pinnedStories.map((s) => s.id));

  const ranked = useMemo(
    () =>
      scoreAndSortStories(filteredStories, profile, interests, followedIds).filter(
        (r) => !dismissed.has(r.story.id) && !pinnedIds.has(r.story.id)
      ),
    // `isPinned` is recreated (new reference) whenever the store's `pinned`
    // array changes — that's what actually invalidates this memo when a
    // story gets pinned/unpinned, since `pinnedIds` itself isn't memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredStories, profile, interests, followedIds, dismissed, isPinned]
  );

  const handleFollow = (story: Story) => {
    const nowFollowing = !isFollowing(story.id);
    if (nowFollowing) {
      follow(story.id, DEFAULT_CADENCE[story.state] ?? "active");
      showToast("Following — you'll be notified on material changes.");
    } else {
      unfollow(story.id);
      showToast("Unfollowed story.", "info");
    }
    // Follow/unfollow is itself a relevance signal — reinforces the matching
    // interest and updates the graph server-side (see api/app/routers/discover.py).
    if (!isGuest && authToken) api.setFollow(story.id, nowFollowing, authToken).catch(() => {});
  };

  const handleNotInterested = (storyId: string, topic: string) => {
    addFeedback({ scope: "story", targetId: storyId, targetLabel: topic, sentiment: "negative" });
    addNegativeSignal(topic, "topic", "Marked story as not interesting from Discover");
    setDismissed((prev) => new Set(prev).add(storyId));
    showToast("Got it — you'll see less like this.", "info");
  };

  const searchRelevance = useMemo(
    () => (searchResult ? scoreAndSortStories([searchResult], profile, interests, followedIds)[0] : null),
    [searchResult, profile, interests, followedIds]
  );

  const cardProps = (story: Story) => ({
    story,
    isFollowing: followedIds.has(story.id),
    onFollow: () => handleFollow(story),
    onNotInterested: () => handleNotInterested(story.id, story.topics[0] ?? story.title),
    isBookmarked: isBookmarked(story.id),
    onToggleBookmark: () => toggleBookmark(story.id),
    isPinned: isPinned(story.id),
    onTogglePin: () => togglePin(story.id),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Your horizon</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Stories selected for relevance, importance and novelty — ranked against your
            Constellation, not just publication volume.
          </p>
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          aria-label="Filters"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            filtersOpen
              ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {filtersOpen && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <Select icon={TagIcon} value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
            <option value="">All your topics</option>
            <option value={BOOKMARKED_VALUE}>★ Bookmarked</option>
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          {!isGuest && (
            <>
              <Select icon={Clock} value={withinHours} onChange={(e) => setWithinHours(e.target.value)}>
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <Select icon={Hash} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {LIMIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <form onSubmit={handleSearch} className="flex min-w-[220px] flex-1 items-center gap-1.5">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search or describe any topic…"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || searching}
                  aria-label="Search"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {searching && <p className="mb-4 text-xs text-slate-400">Looking that up — this fetches fresh news and can take a moment…</p>}

      {searchResult && searchRelevance && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search result</h2>
            <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-w-md">
            <StoryCard {...cardProps(searchResult)} relevance={searchRelevance.relevance} />
          </div>
        </div>
      )}

      {pinnedStories.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Pin className="h-3 w-3" /> Pinned
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedStories.map((story) => (
              <StoryCard
                key={story.id}
                {...cardProps(story)}
                relevance={scoreAndSortStories([story], profile, interests, followedIds)[0].relevance}
              />
            ))}
          </div>
        </div>
      )}

      {!isGuest && loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Fetching your feed…</p>
        </div>
      ) : ranked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isGuest
              ? "No stories left in this session — feedback preferences update live. Refresh to reset the demo dismissals."
              : "No matching news yet — it's refreshed from your interests every few minutes, check back shortly."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map(({ story, relevance }) => (
            <StoryCard key={story.id} {...cardProps(story)} relevance={relevance} />
          ))}
        </div>
      )}
    </div>
  );
}
