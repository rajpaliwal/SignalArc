// Shared domain types for the SignalArc static frontend prototype.
// These mirror the blueprint's data model (personal graph + world-event graph)
// closely enough that swapping in a real API later is a data-source change,
// not a UI rewrite.

export type InterestSource = "explicit" | "inferred";

export type InterestType =
  | "topic"
  | "place"
  | "profession"
  | "hobby"
  | "sport"
  | "movie"
  | "political"
  | "other";

export interface InterestEdge {
  id: string;
  label: string;
  type: InterestType;
  source: InterestSource;
  explicitWeight: number;
  implicitWeight: number;
  negativeWeight: number;
  confidence: number; // 0-1
  reason: string;
  createdAt: string;
  lastReinforcedAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  city: string;
  country: string;
  profession: string;
  hobbies: string[];
  sports: string[];
  movies: string[];
  politicalInterests: string[];
  otherInterests: string;
  createdAt: string;
}

export type EvidenceStatus =
  | "observed"
  | "reported"
  | "corroborated"
  | "disputed"
  | "corrected"
  | "scenario";

export interface Source {
  id: string;
  name: string;
  url: string;
  isPrimary: boolean;
  publishedAt: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  status: EvidenceStatus;
  sourceIds: string[];
  isLatest?: boolean;
}

export interface Claim {
  id: string;
  text: string;
  claimant: string;
  status: EvidenceStatus;
  sourceIds: string[];
}

export interface Decision {
  id: string;
  decisionMaker: string;
  text: string;
  effectiveDate: string;
  scope: string;
}

export interface Outcome {
  id: string;
  text: string;
  metric?: string;
  observedAt: string;
  attributionStatus: EvidenceStatus;
}

export interface DisputedItem {
  id: string;
  topic: string;
  positions: { claim: string; sourceIds: string[] }[];
}

export interface Correction {
  id: string;
  date: string;
  text: string;
  sourceId: string;
}

export interface WhatIfSeed {
  question: string;
  assumptions: string[];
  scenario: string;
  confidence: "low" | "medium" | "high";
}

export interface WhatIfExchange {
  id: string;
  question: string;
  assumptions: string[];
  scenario: string;
  confidence: "low" | "medium" | "high";
  createdAt: string;
}

export type StoryState = "breaking" | "active" | "slow" | "dormant" | "resolved";

export interface Story {
  id: string;
  title: string;
  summary: string;
  currentState: string;
  /** How this story started — LLM-synthesized for real (non-mock) stories with 2+ articles. */
  cause?: string;
  state: StoryState;
  topics: string[];
  places: string[];
  people: string[];
  organisations: string[];
  updatedAt: string;
  firstSeenAt: string;
  sources: Source[];
  timeline: TimelineEvent[];
  decisions: Decision[];
  claims: Claim[];
  outcomes: Outcome[];
  disputed: DisputedItem[];
  unknowns: string[];
  corrections: Correction[];
  analysis: {
    summary: string;
    keyDrivers: string[];
    risks: string[];
    outlook: string;
  };
  whatIfSeeds: WhatIfSeed[];
  baseImportance: number; // 0-1 editorial importance
  baseNovelty: number; // 0-1
}

export type Cadence = "breaking" | "active" | "slow" | "dormant";

export interface Subscription {
  storyId: string;
  status: "following" | "paused";
  cadence: Cadence;
  followedAt: string;
}

export interface ChatExtraction {
  topic: string;
  verdict: "interested" | "temporary" | "negative" | "none";
  confidence: number;
  matchedStoryId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  extractions?: ChatExtraction[];
  suggestedStoryId?: string;
}

export type FeedbackScope = "story" | "topic" | "place" | "entity" | "source";

export interface FeedbackRecord {
  id: string;
  scope: FeedbackScope;
  targetId: string;
  targetLabel: string;
  sentiment: "positive" | "negative";
  createdAt: string;
}

export type NotificationFrequency = "instant" | "daily" | "weekly";

export interface NotificationSettings {
  emailEnabled: boolean;
  email: string;
  defaultFrequency: NotificationFrequency;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface RelevanceComponent {
  label: string;
  contribution: number; // 0-1, normalised
  reason: string;
}

export interface RelevanceResult {
  score: number;
  components: RelevanceComponent[];
  topReasons: string[];
}
