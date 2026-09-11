import { STORIES } from "./mock-data";
import type { ChatExtraction } from "./types";

// A deterministic stand-in for the "was this a temp chat or a real interest"
// classifier described in the blueprint (S4.1 / S6, HLR-06). No model calls —
// just keyword + phrase heuristics — but the shape of the output (topic,
// verdict, confidence) is exactly what a real extraction pipeline would emit,
// so the graph-writing logic downstream doesn't need to change later.

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "AI Policy": ["ai policy", "ai regulation", "ai act", "ai governance", "ai law"],
  "Artificial Intelligence": ["ai ", "artificial intelligence", "machine learning", "llm", "gpt", "chatgpt", "neural network"],
  "Technology Regulation": ["tech regulation", "data protection", "gdpr", "antitrust", "big tech"],
  Startups: ["startup", "founder", "venture capital", "funding round", "y combinator"],
  "Climate & Energy": ["climate", "renewable", "solar", "carbon", "emissions"],
  "Economy & Markets": ["economy", "inflation", "interest rate", "stock market", "recession", "budget"],
  Science: ["science", "research paper", "physics", "biology", "space", "nasa", "isro"],
  Cricket: ["cricket", "ipl", "bcci", "test match", "world cup", "wicket", "batting"],
  Football: ["football", "premier league", "soccer", "champions league"],
  Tennis: ["tennis", "wimbledon", "grand slam"],
  "Formula 1": ["formula 1", "f1", "grand prix"],
  Olympics: ["olympics", "olympic games"],
  Bollywood: ["bollywood", "hindi film", "shah rukh", "hindi cinema"],
  Hollywood: ["hollywood", "marvel", "oscars"],
  "Streaming & TV": ["netflix", "streaming", "tv show", "web series"],
  Music: ["music", "album", "concert", "spotify"],
  "Indian Politics": ["modi", "bjp", "congress party", "lok sabha", "indian politics", "delhi politics"],
  "UK Politics": ["starmer", "labour party", "tory", "conservative party", "westminster", "uk politics", "downing street", "home office"],
  "US Politics": ["congress", "senate", "white house", "us politics", "washington"],
  "Global Affairs": ["united nations", "geopolitics", "diplomacy", "foreign policy"],
  Elections: ["election", "voting", "poll", "referendum", "ballot"],
};

const INTEREST_PHRASES = [
  "i love",
  "i really like",
  "i'm into",
  "im into",
  "really into",
  "big fan of",
  "i follow",
  "been following",
  "following closely",
  "following it closely",
  "keeping track of",
  "interested in",
  "obsessed with",
  "always read about",
  "care a lot about",
  "keep up with",
  "excited about",
  "worried about",
  "watching closely",
  "passionate about",
  "keen on",
];

const TEMP_PHRASES = [
  "just curious",
  "randomly",
  "no big deal",
  "just asking",
  "just wondering",
  "one time",
  "saw a headline",
  "not that important",
  "just heard",
  "out of nowhere",
];

const NEGATIVE_PHRASES = [
  "hate",
  "not interested in",
  "annoyed by",
  "sick of",
  "don't care about",
  "dont care about",
  "tired of hearing about",
  "please stop showing",
];

function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) hits.push(topic);
  }
  return hits;
}

export function analyzeMessage(text: string): ChatExtraction[] {
  const lower = text.toLowerCase();
  const topics = detectTopics(text);
  if (topics.length === 0) return [];

  const hasInterestPhrase = INTEREST_PHRASES.some((p) => lower.includes(p));
  const hasTempPhrase = TEMP_PHRASES.some((p) => lower.includes(p));
  const hasNegativePhrase = NEGATIVE_PHRASES.some((p) => lower.includes(p));

  return topics.map((topic) => {
    let confidence = 0.5;
    if (hasInterestPhrase) confidence += 0.32;
    if (hasTempPhrase) confidence -= 0.35;
    if (text.trim().length > 80) confidence += 0.08; // longer, more specific messages read as more genuine
    confidence = Math.max(0.05, Math.min(0.97, confidence));

    let verdict: ChatExtraction["verdict"] = confidence >= 0.6 ? "interested" : "temporary";
    if (hasNegativePhrase) verdict = "negative";

    const matchedStory = STORIES.find((s) => s.topics.includes(topic));

    return {
      topic,
      verdict,
      confidence,
      matchedStoryId: verdict === "interested" ? matchedStory?.id : undefined,
    };
  });
}

const ACK_TEMPLATES = {
  interested: (topic: string) => `Got it — I'll keep an eye on ${topic} for you and weight it into your feed.`,
  temporary: (topic: string) => `Noted — sounds like a passing mention of ${topic}, so I won't add it to your profile.`,
  negative: (topic: string) => `Understood — I'll stop surfacing ${topic} stories and mark it as not interesting.`,
  none: () => "Thanks for sharing — I didn't catch a specific topic there, so nothing's being added to your profile.",
};

export function buildAssistantReply(extractions: ChatExtraction[]): { text: string; suggestedStoryId?: string } {
  if (extractions.length === 0) {
    return { text: ACK_TEMPLATES.none() };
  }

  const primary = extractions[0];
  let text = ACK_TEMPLATES[primary.verdict](primary.topic);

  if (extractions.length > 1) {
    const rest = extractions.slice(1).map((e) => e.topic);
    text += ` I also picked up on ${rest.join(", ")}.`;
  }

  const suggestion = extractions.find((e) => e.matchedStoryId);
  if (suggestion?.matchedStoryId) {
    const story = STORIES.find((s) => s.id === suggestion.matchedStoryId);
    if (story) {
      text += ` By the way, there's a developing story you might want to see: "${story.title}".`;
      return { text, suggestedStoryId: story.id };
    }
  }

  return { text };
}
