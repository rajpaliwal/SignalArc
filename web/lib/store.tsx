"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiInterestToEdge, type ApiFollowedStory, type ApiInterest, type ApiUser } from "./api";
import type {
  Cadence,
  ChatMessage,
  FeedbackRecord,
  InterestEdge,
  InterestType,
  NotificationSettings,
  Subscription,
  UserProfile,
  WhatIfExchange,
} from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "signalarc:v1";

interface AppState {
  profile: UserProfile | null;
  authToken: string | null;
  isGuest: boolean;
  interests: InterestEdge[];
  implicitLearningEnabled: boolean;
  chatMessages: ChatMessage[];
  subscriptions: Subscription[];
  feedback: FeedbackRecord[];
  notificationSettings: NotificationSettings;
  whatIfHistory: Record<string, WhatIfExchange[]>;
  bookmarked: string[];
  pinned: string[];
  /** Stories the graph says this user follows (see `User-[:FOLLOWS]->Story`
   * in api/app/graph/nodes.py) — fetched by Constellation, same pattern as
   * `setConstellationData`'s interests. Real story stubs, not mock ids. */
  followedStoryStubs: { id: string; title: string; state: string }[];
}

function defaultState(): AppState {
  return {
    profile: null,
    authToken: null,
    isGuest: false,
    interests: [],
    implicitLearningEnabled: true,
    chatMessages: [],
    subscriptions: [],
    feedback: [],
    notificationSettings: {
      emailEnabled: false,
      email: "",
      defaultFrequency: "daily",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    },
    whatIfHistory: {},
    bookmarked: [],
    pinned: [],
    followedStoryStubs: [],
  };
}

const GUEST_PROFILE: UserProfile = {
  name: "Guest Explorer",
  email: "",
  city: "London",
  country: "United Kingdom",
  profession: "AI Engineer",
  hobbies: ["Reading"],
  sports: ["Cricket"],
  movies: [],
  politicalInterests: ["Indian Politics", "UK Politics"],
  otherInterests: "",
  createdAt: new Date(0).toISOString(),
};

const GUEST_INTERESTS: { label: string; type: InterestType }[] = [
  { label: "Artificial Intelligence", type: "topic" },
  { label: "AI Policy", type: "topic" },
  { label: "UK Politics", type: "political" },
  { label: "Indian Politics", type: "political" },
  { label: "Cricket", type: "sport" },
  { label: "London", type: "place" },
  { label: "United Kingdom", type: "place" },
  { label: "AI Engineer", type: "profession" },
];

interface AppStore extends AppState {
  hydrated: boolean;
  setProfile: (profile: UserProfile) => void;
  applyAuthSession: (token: string, user: ApiUser) => void;
  addServerInterests: (interests: ApiInterest[]) => void;
  setConstellationData: (user: ApiUser, interests: ApiInterest[], followedStories?: ApiFollowedStory[]) => void;
  toggleBookmark: (storyId: string) => void;
  togglePin: (storyId: string) => void;
  isBookmarked: (storyId: string) => boolean;
  isPinned: (storyId: string) => boolean;
  startGuestExploration: () => void;
  updateProfileFields: (partial: Partial<UserProfile>) => void;
  addExplicitInterests: (items: { label: string; type: InterestType }[]) => void;
  addInferredInterest: (label: string, type: InterestType, confidence: number, reason: string) => void;
  addNegativeSignal: (label: string, type: InterestType, reason: string) => void;
  removeInterest: (id: string) => void;
  setImplicitLearningEnabled: (value: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  follow: (storyId: string, cadence: Cadence) => void;
  unfollow: (storyId: string) => void;
  setCadence: (storyId: string, cadence: Cadence) => void;
  toggleSubscriptionStatus: (storyId: string) => void;
  isFollowing: (storyId: string) => boolean;
  getSubscription: (storyId: string) => Subscription | undefined;
  addFeedback: (record: Omit<FeedbackRecord, "id" | "createdAt">) => void;
  updateNotificationSettings: (partial: Partial<NotificationSettings>) => void;
  addWhatIf: (storyId: string, exchange: WhatIfExchange) => void;
  exportData: () => string;
  resetAll: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

function normLabel(s: string) {
  return s.trim().toLowerCase();
}

function makeExplicitEdge(item: { label: string; type: InterestType }, now: string, reason: string): InterestEdge {
  return {
    id: uid("int"),
    label: item.label,
    type: item.type,
    source: "explicit",
    explicitWeight: 1,
    implicitWeight: 0,
    negativeWeight: 0,
    confidence: 1,
    reason,
    createdAt: now,
    lastReinforcedAt: now,
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage, deferred to a client-only effect
    // so the server-rendered markup (always defaultState()) matches the
    // client's first paint and React doesn't throw a hydration mismatch.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ ...defaultState(), ...parsed });
      }
    } catch {
      // corrupt or inaccessible storage — fall back to defaults
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — state still works for this session
    }
  }, [state, hydrated]);

  const setProfile = useCallback((profile: UserProfile) => {
    setState((s) => ({ ...s, profile, isGuest: false }));
  }, []);

  /** Applies a real backend session (register/login response) — keeps
   * whatever onboarding fields are already known locally, since the
   * backend account only owns name/email/city/country/profession. */
  const applyAuthSession = useCallback((token: string, user: ApiUser) => {
    setState((s) => ({
      ...s,
      authToken: token,
      isGuest: false,
      profile: {
        hobbies: [],
        sports: [],
        movies: [],
        politicalInterests: [],
        otherInterests: "",
        createdAt: new Date().toISOString(),
        ...s.profile,
        name: user.name,
        email: user.email,
        city: user.city,
        country: user.country,
        profession: user.profession ?? "",
      },
    }));
  }, []);

  /** Mirrors interests the backend just created (via `/auth/me/interests`)
   * into local state, in the same `InterestEdge` shape the rest of the
   * app already reads. */
  const addServerInterests = useCallback((interests: ApiInterest[]) => {
    setState((s) => ({
      ...s,
      interests: [...s.interests, ...interests.map(apiInterestToEdge)],
    }));
  }, []);

  /** Replaces interests wholesale (not append) — used by the Constellation
   * page, which fetches the authoritative state straight from Neo4j on
   * every visit rather than trusting whatever was last cached locally.
   * Reuses the exact same mapping `addServerInterests` uses. */
  const setConstellationData = useCallback((user: ApiUser, interests: ApiInterest[], followedStories?: ApiFollowedStory[]) => {
    setState((s) => ({
      ...s,
      profile: s.profile
        ? { ...s.profile, name: user.name, city: user.city, country: user.country, profession: user.profession ?? "" }
        : s.profile,
      interests: interests.map(apiInterestToEdge),
      followedStoryStubs: followedStories ?? s.followedStoryStubs,
    }));
  }, []);

  const toggleBookmark = useCallback((storyId: string) => {
    setState((s) => ({
      ...s,
      bookmarked: s.bookmarked.includes(storyId) ? s.bookmarked.filter((id) => id !== storyId) : [...s.bookmarked, storyId],
    }));
  }, []);

  const togglePin = useCallback((storyId: string) => {
    setState((s) => ({
      ...s,
      pinned: s.pinned.includes(storyId) ? s.pinned.filter((id) => id !== storyId) : [...s.pinned, storyId],
    }));
  }, []);

  const startGuestExploration = useCallback(() => {
    setState((s) => {
      if (s.profile) return s; // already have a real or guest profile — don't clobber it
      const now = new Date().toISOString();
      const additions: InterestEdge[] = GUEST_INTERESTS.map((item) => makeExplicitEdge(item, now, "Seeded for guest exploration"));
      return { ...s, profile: { ...GUEST_PROFILE, createdAt: now }, isGuest: true, interests: additions };
    });
  }, []);

  const updateProfileFields = useCallback((partial: Partial<UserProfile>) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...partial } } : s));
  }, []);

  const addExplicitInterests = useCallback((items: { label: string; type: InterestType }[]) => {
    setState((s) => {
      const now = new Date().toISOString();
      const existingLabels = new Set(s.interests.map((e) => normLabel(e.label)));
      const additions: InterestEdge[] = items
        .filter((item) => item.label.trim() && !existingLabels.has(normLabel(item.label)))
        .map((item) => makeExplicitEdge({ label: item.label.trim(), type: item.type }, now, "Selected during onboarding"));
      return { ...s, interests: [...s.interests, ...additions] };
    });
  }, []);

  const addInferredInterest = useCallback(
    (label: string, type: InterestType, confidence: number, reason: string) => {
      setState((s) => {
        if (!s.implicitLearningEnabled) return s;
        const now = new Date().toISOString();
        const idx = s.interests.findIndex((e) => normLabel(e.label) === normLabel(label));
        if (idx >= 0) {
          const existing = s.interests[idx];
          const updated: InterestEdge = {
            ...existing,
            implicitWeight: Math.min(1, existing.implicitWeight + 0.2),
            confidence: Math.max(existing.confidence, confidence),
            reason,
            lastReinforcedAt: now,
          };
          const next = [...s.interests];
          next[idx] = updated;
          return { ...s, interests: next };
        }
        const created: InterestEdge = {
          id: uid("int"),
          label,
          type,
          source: "inferred",
          explicitWeight: 0,
          implicitWeight: confidence,
          negativeWeight: 0,
          confidence,
          reason,
          createdAt: now,
          lastReinforcedAt: now,
        };
        return { ...s, interests: [...s.interests, created] };
      });
    },
    []
  );

  const addNegativeSignal = useCallback((label: string, type: InterestType, reason: string) => {
    setState((s) => {
      const now = new Date().toISOString();
      const idx = s.interests.findIndex((e) => normLabel(e.label) === normLabel(label));
      if (idx >= 0) {
        const existing = s.interests[idx];
        const updated: InterestEdge = { ...existing, negativeWeight: 1, reason, lastReinforcedAt: now };
        const next = [...s.interests];
        next[idx] = updated;
        return { ...s, interests: next };
      }
      const created: InterestEdge = {
        id: uid("int"),
        label,
        type,
        source: "inferred",
        explicitWeight: 0,
        implicitWeight: 0,
        negativeWeight: 1,
        confidence: 0.8,
        reason,
        createdAt: now,
        lastReinforcedAt: now,
      };
      return { ...s, interests: [...s.interests, created] };
    });
  }, []);

  const removeInterest = useCallback((id: string) => {
    setState((s) => ({ ...s, interests: s.interests.filter((e) => e.id !== id) }));
  }, []);

  const setImplicitLearningEnabled = useCallback((value: boolean) => {
    setState((s) => ({ ...s, implicitLearningEnabled: value }));
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState((s) => ({ ...s, chatMessages: [...s.chatMessages, message] }));
  }, []);

  const follow = useCallback((storyId: string, cadence: Cadence) => {
    setState((s) => {
      const withoutExisting = s.subscriptions.filter((sub) => sub.storyId !== storyId);
      const sub: Subscription = {
        storyId,
        status: "following",
        cadence,
        followedAt: new Date().toISOString(),
      };
      return { ...s, subscriptions: [...withoutExisting, sub] };
    });
  }, []);

  const unfollow = useCallback((storyId: string) => {
    setState((s) => ({ ...s, subscriptions: s.subscriptions.filter((sub) => sub.storyId !== storyId) }));
  }, []);

  const setCadence = useCallback((storyId: string, cadence: Cadence) => {
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((sub) => (sub.storyId === storyId ? { ...sub, cadence } : sub)),
    }));
  }, []);

  const toggleSubscriptionStatus = useCallback((storyId: string) => {
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((sub) =>
        sub.storyId === storyId ? { ...sub, status: sub.status === "following" ? "paused" : "following" } : sub
      ),
    }));
  }, []);

  const isFollowing = useCallback(
    (storyId: string) => state.subscriptions.some((sub) => sub.storyId === storyId && sub.status === "following"),
    [state.subscriptions]
  );

  const getSubscription = useCallback(
    (storyId: string) => state.subscriptions.find((sub) => sub.storyId === storyId),
    [state.subscriptions]
  );

  const isBookmarked = useCallback((storyId: string) => state.bookmarked.includes(storyId), [state.bookmarked]);
  const isPinned = useCallback((storyId: string) => state.pinned.includes(storyId), [state.pinned]);

  const addFeedback = useCallback((record: Omit<FeedbackRecord, "id" | "createdAt">) => {
    setState((s) => ({
      ...s,
      feedback: [...s.feedback, { ...record, id: uid("fb"), createdAt: new Date().toISOString() }],
    }));
  }, []);

  const updateNotificationSettings = useCallback((partial: Partial<NotificationSettings>) => {
    setState((s) => ({ ...s, notificationSettings: { ...s.notificationSettings, ...partial } }));
  }, []);

  const addWhatIf = useCallback((storyId: string, exchange: WhatIfExchange) => {
    setState((s) => ({
      ...s,
      whatIfHistory: {
        ...s.whatIfHistory,
        [storyId]: [...(s.whatIfHistory[storyId] ?? []), exchange],
      },
    }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const resetAll = useCallback(() => {
    setState(defaultState());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      ...state,
      hydrated,
      setProfile,
      applyAuthSession,
      addServerInterests,
      setConstellationData,
      toggleBookmark,
      togglePin,
      isBookmarked,
      isPinned,
      startGuestExploration,
      updateProfileFields,
      addExplicitInterests,
      addInferredInterest,
      addNegativeSignal,
      removeInterest,
      setImplicitLearningEnabled,
      addChatMessage,
      follow,
      unfollow,
      setCadence,
      toggleSubscriptionStatus,
      isFollowing,
      getSubscription,
      addFeedback,
      updateNotificationSettings,
      addWhatIf,
      exportData,
      resetAll,
    }),
    [
      state,
      hydrated,
      setProfile,
      applyAuthSession,
      addServerInterests,
      setConstellationData,
      toggleBookmark,
      togglePin,
      isBookmarked,
      isPinned,
      startGuestExploration,
      updateProfileFields,
      addExplicitInterests,
      addInferredInterest,
      addNegativeSignal,
      removeInterest,
      setImplicitLearningEnabled,
      addChatMessage,
      follow,
      unfollow,
      setCadence,
      toggleSubscriptionStatus,
      isFollowing,
      getSubscription,
      addFeedback,
      updateNotificationSettings,
      addWhatIf,
      exportData,
      resetAll,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
