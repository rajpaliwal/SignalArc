import type { Story, WhatIfSeed } from "./types";

// Mock "what-if" predictor. Per the blueprint's evidence model (S9.1),
// scenario output is explicitly never presented as fact — every result here
// carries a confidence level and an assumptions list, and callers are
// expected to label it as a scenario in the UI.

const STOPWORDS = new Set([
  "what",
  "if",
  "the",
  "a",
  "an",
  "is",
  "are",
  "will",
  "would",
  "could",
  "does",
  "do",
  "to",
  "of",
  "in",
  "on",
  "and",
  "or",
  "for",
  "this",
  "that",
]);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

export interface WhatIfPrediction {
  assumptions: string[];
  scenario: string;
  confidence: "low" | "medium" | "high";
  matchedSeed: boolean;
}

export function predictWhatIf(story: Story, question: string): WhatIfPrediction {
  const questionWords = keywords(question);

  let best: { seed: WhatIfSeed; overlap: number } | null = null;
  for (const seed of story.whatIfSeeds) {
    const seedWords = keywords(seed.question);
    const overlap = [...questionWords].filter((w) => seedWords.has(w)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) {
      best = { seed, overlap };
    }
  }

  if (best && best.overlap >= 2) {
    return {
      assumptions: best.seed.assumptions,
      scenario: best.seed.scenario,
      confidence: best.seed.confidence,
      matchedSeed: true,
    };
  }

  return {
    assumptions: [
      "The story continues on its current trajectory",
      "No unrelated major event intervenes",
    ],
    scenario: `Based on the current state — "${story.currentState}" — the most likely near-term path follows the outlook already noted in the analysis: ${story.analysis.outlook} This is a low-confidence extrapolation, not a grounded prediction; ask a more specific question (referencing an actor, decision, or date from the timeline) for a sharper scenario.`,
    confidence: "low",
    matchedSeed: false,
  };
}
