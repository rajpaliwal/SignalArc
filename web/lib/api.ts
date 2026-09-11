"use client";

/** Thin client for the SignalArc backend (registration, login, interests). */

import type { InterestEdge, InterestSource, InterestType, Story } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  city: string;
  country: string;
  profession: string | null;
}

export interface ApiTokenResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiInterest {
  id: string;
  label: string;
  type: string;
  source: string;
  explicit_weight: number;
  implicit_weight: number;
  negative_weight: number;
  confidence: number;
  reason: string;
  created_at: string;
  last_reinforced_at: string;
}

export interface ApiFollowedStory {
  id: string;
  title: string;
  state: string;
}

export interface ApiConstellation {
  user: ApiUser;
  interests: ApiInterest[];
  followed_stories: ApiFollowedStory[];
}

/** Shared by onboarding's `addServerInterests` and the Constellation page's
 * live fetch — both turn the API's `ApiInterest` shape into the same
 * `InterestEdge` the rest of the app already reads. */
export function apiInterestToEdge(i: ApiInterest): InterestEdge {
  return {
    id: i.id,
    label: i.label,
    type: i.type as InterestType,
    source: i.source as InterestSource,
    explicitWeight: i.explicit_weight,
    implicitWeight: i.implicit_weight,
    negativeWeight: i.negative_weight,
    confidence: i.confidence,
    reason: i.reason,
    createdAt: i.created_at,
    lastReinforcedAt: i.last_reinforced_at,
  };
}

export interface ApiSource {
  name: string;
  headline: string;
  summary: string;
  url: string;
  published_at: string;
}

export interface ApiTimelineItem {
  date: string;
  title: string;
  description: string;
  highlight: boolean;
}

export interface ApiAnalysis {
  key_drivers: string[];
  risks: string[];
  outlook: string;
  what_if_seeds: string[];
}

export interface ApiStory {
  id: string;
  title: string;
  summary: string;
  cause: string;
  topic: string;
  state: string;
  timeline: ApiTimelineItem[];
  analysis: ApiAnalysis;
  first_seen_at: string;
  updated_at: string;
  sources: ApiSource[];
}

export interface ApiWhatIfAnswer {
  scenario: string;
  assumptions: string[];
  confidence: "low" | "medium" | "high";
}

/** Fills in the rich `Story` fields the live news pipeline still doesn't
 * populate (claims, decisions, disputed items, ...) so `StoryCard`,
 * `relevance.ts` and the story-detail panels run unmodified against real,
 * backend-fetched, LLM-clustered stories. */
export function apiStoryToStory(s: ApiStory): Story {
  const sources = s.sources.map((src, i) => ({
    id: `${s.id}-src-${i}`,
    name: src.name,
    url: src.url,
    isPrimary: i === 0,
    publishedAt: src.published_at,
  }));
  const timeline = s.timeline.length
    ? s.timeline.map((t, i) => ({
        id: `${s.id}-t${i}`,
        date: t.date,
        title: t.title,
        description: t.description,
        status: "reported" as const,
        sourceIds: [],
        isLatest: i === s.timeline.length - 1,
      }))
    : sources.length
      ? [
          {
            id: `${s.id}-t0`,
            date: s.first_seen_at,
            title: "First reported",
            description: s.summary,
            status: "reported" as const,
            sourceIds: [sources[0].id],
          },
        ]
      : [];
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    currentState: s.summary,
    cause: s.cause,
    state: (s.state as Story["state"]) ?? "active",
    topics: [s.topic],
    places: [],
    people: [],
    organisations: [],
    updatedAt: s.updated_at,
    firstSeenAt: s.first_seen_at,
    sources,
    timeline,
    decisions: [],
    claims: [],
    outcomes: [],
    disputed: [],
    unknowns: [],
    corrections: [],
    // Empty until the Analysis/What-if tab is opened — see `api.getAnalysis`,
    // which merges the real (lazily-fetched) values into this same shape.
    analysis: {
      summary: s.summary,
      keyDrivers: s.analysis.key_drivers,
      risks: s.analysis.risks,
      outlook: s.analysis.outlook,
    },
    whatIfSeeds: s.analysis.what_if_seeds.map((question) => ({ question, assumptions: [], scenario: "", confidence: "medium" as const })),
    baseImportance: Math.min(1, sources.length / 6),
    baseNovelty: 0.5,
  };
}

export class ApiError extends Error {}

/**
 * FastAPI's `detail` is a plain string for our own `HTTPException` raises
 * (401, 409, ...), but a *list* of `{msg, loc, ...}` objects for its
 * automatic request-validation errors (422) — passing that list straight
 * into `Error`'s message stringifies it as "[object Object]".
 */
async function extractErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : String(e)))
      .join("; ");
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T; // no body to parse (e.g. DELETE /auth/me)
  }
  return response.json() as Promise<T>;
}

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    city: string;
    country: string;
    profession?: string;
  }) => request<ApiTokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<ApiTokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: (token: string) => request<ApiUser>("/auth/me", {}, token),

  deleteAccount: (token: string) => request<void>("/auth/me", { method: "DELETE" }, token),

  getConstellation: (token: string) => request<ApiConstellation>("/auth/me/constellation", {}, token),

  getDiscoverStories: (token: string, opts?: { limit?: number; withinHours?: number }) => {
    const params = new URLSearchParams();
    if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts?.withinHours !== undefined) params.set("within_hours", String(opts.withinHours));
    const qs = params.toString();
    return request<ApiStory[]>(`/discover/stories${qs ? `?${qs}` : ""}`, {}, token);
  },

  /** On-demand: fetches this exact query right now and either folds it into
   * a semantically matching existing story or narrates a brand new one. */
  searchStory: (query: string, token: string) => request<ApiStory>("/discover/search", { method: "POST", body: JSON.stringify({ query }) }, token),

  getStory: (id: string, token: string) => request<ApiStory>(`/discover/stories/${id}`, {}, token),

  /** Computed on first request, cached after — call only when the Analysis
   * or What-if tab is actually opened, never eagerly. */
  getAnalysis: (id: string, token: string) => request<ApiAnalysis>(`/discover/stories/${id}/analysis`, {}, token),

  askWhatIf: (id: string, question: string, token: string) =>
    request<ApiWhatIfAnswer>(`/discover/stories/${id}/whatif`, { method: "POST", body: JSON.stringify({ question }) }, token),

  /** Follow/unfollow is itself a relevance signal server-side: it strengthens
   * or weakens the matching interest and adds/removes a graph edge — not
   * just local UI state. */
  setFollow: (id: string, following: boolean, token: string) =>
    request<void>(`/discover/stories/${id}/follow`, { method: "POST", body: JSON.stringify({ following }) }, token),

  addInterests: (
    token: string,
    body: {
      hobbies: string[];
      topics: string[];
      sports: string[];
      movies: string[];
      political_interests: string[];
      other: string;
    }
  ) => request<ApiInterest[]>("/auth/me/interests", { method: "POST", body: JSON.stringify(body) }, token),
};
