import type { InterestEdge, RelevanceComponent, RelevanceResult, Story, UserProfile } from "./types";

// Simplified, client-side version of the blueprint's ranking expression
// (S9.2): topic + entity + geography + profession + subscription strength +
// importance + novelty + source diversity - repetition - negative feedback.
// Every component is stored, not just the final score, so the UI can render
// an honest "why this is relevant" explanation instead of a black box.

const norm = (s: string) => s.trim().toLowerCase();

function bestEdgeMatch(label: string, edges: InterestEdge[]): InterestEdge | undefined {
  const l = norm(label);
  return edges.find((e) => norm(e.label) === l || l.includes(norm(e.label)) || norm(e.label).includes(l));
}

export function computeRelevance(
  story: Story,
  profile: UserProfile | null,
  edges: InterestEdge[],
  isFollowing: boolean
): RelevanceResult {
  const components: RelevanceComponent[] = [];
  const positiveEdges = edges.filter((e) => e.negativeWeight === 0);
  const negativeEdges = edges.filter((e) => e.negativeWeight > 0);

  // Topic match
  let topicScore = 0;
  const matchedTopics: string[] = [];
  for (const topic of story.topics) {
    const edge = bestEdgeMatch(topic, positiveEdges);
    if (edge) {
      const strength = edge.explicitWeight + edge.implicitWeight * edge.confidence;
      topicScore += strength;
      matchedTopics.push(topic);
    }
  }
  if (matchedTopics.length > 0) {
    components.push({
      label: "Topic match",
      contribution: Math.min(1, topicScore / 2),
      reason: `Matches your interest in ${matchedTopics.slice(0, 2).join(" and ")}`,
    });
  }

  // Geography
  if (profile) {
    const here = [profile.city, profile.country].filter(Boolean).map(norm);
    const placeMatch = story.places.find((p) => here.includes(norm(p)));
    if (placeMatch) {
      components.push({
        label: "Geography",
        contribution: 0.6,
        reason: `Relevant to ${placeMatch}, where you're based`,
      });
    }
  }

  // Profession
  if (profile?.profession) {
    const prof = norm(profile.profession);
    const professionSignals = ["ai", "engineer", "developer", "software", "tech", "data", "product"];
    const isTechProfession = professionSignals.some((sig) => prof.includes(sig));
    const storyTouchesTech = story.topics.some((t) =>
      ["ai", "technology"].some((k) => norm(t).includes(k))
    );
    if (isTechProfession && storyTouchesTech) {
      components.push({
        label: "Profession",
        contribution: 0.5,
        reason: `Touches your field (${profile.profession})`,
      });
    }
  }

  // Subscription strength
  if (isFollowing) {
    components.push({
      label: "Subscription",
      contribution: 1,
      reason: "You're following this story",
    });
  }

  // Importance / novelty (editorial signals, always present but usually minor)
  if (story.baseImportance >= 0.75) {
    components.push({
      label: "Importance",
      contribution: story.baseImportance,
      reason: "Widely covered, high-consequence development",
    });
  }
  if (story.baseNovelty >= 0.7) {
    components.push({
      label: "Novelty",
      contribution: story.baseNovelty,
      reason: "New development, not just repeated coverage",
    });
  }

  // Source diversity
  const distinctSources = new Set(story.sources.map((s) => s.name)).size;
  const diversity = story.sources.length > 0 ? distinctSources / story.sources.length : 0;
  if (diversity >= 0.75 && story.sources.length >= 3) {
    components.push({
      label: "Source diversity",
      contribution: diversity * 0.4,
      reason: `Corroborated across ${distinctSources} independent sources`,
    });
  }

  // Negative feedback / muted topics pull the score down
  for (const topic of [...story.topics, ...story.places]) {
    const edge = bestEdgeMatch(topic, negativeEdges);
    if (edge) {
      components.push({
        label: "Negative feedback",
        contribution: -0.5,
        reason: `You marked "${edge.label}" as not interesting`,
      });
    }
  }

  const score = Math.max(0, components.reduce((acc, c) => acc + c.contribution, 0));

  const topReasons = components
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((c) => c.reason);

  if (topReasons.length === 0) {
    topReasons.push("Broadly newsworthy — outside your stated interests, shown for diversity");
  }

  return { score, components, topReasons };
}

export function scoreAndSortStories(
  stories: Story[],
  profile: UserProfile | null,
  edges: InterestEdge[],
  followedIds: Set<string>
): { story: Story; relevance: RelevanceResult }[] {
  return stories
    .map((story) => ({
      story,
      relevance: computeRelevance(story, profile, edges, followedIds.has(story.id)),
    }))
    .sort((a, b) => b.relevance.score - a.relevance.score);
}
