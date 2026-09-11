"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipSelector } from "@/components/ChipSelector";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { api, ApiError } from "@/lib/api";
import { HOBBY_OPTIONS, TOPIC_TAXONOMY } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { InterestType } from "@/lib/types";

const topicsByGroup = (group: string) => TOPIC_TAXONOMY.filter((t) => t.group === group).map((t) => t.label);

type StepId = "hobbies" | "interests" | "sports" | "movies" | "political" | "other" | "review";

const STEPS: { id: StepId; title: string; subtitle: string; optional?: boolean }[] = [
  { id: "hobbies", title: "What do you do for fun?", subtitle: "Pick a few hobbies — helps us tell general interest from noise." },
  { id: "interests", title: "What topics do you follow?", subtitle: "AI, policy, markets — whatever you'd actually want a briefing on." },
  { id: "sports", title: "Any sports you follow?", subtitle: "Optional — skip if sport isn't your thing." },
  { id: "movies", title: "Movies & entertainment", subtitle: "Optional — helps distinguish culture chatter from news." },
  { id: "political", title: "Political interests", subtitle: "Optional and sensitive — only used to shape your feed, never shared. Edit or remove anytime." },
  { id: "other", title: "Anything else?", subtitle: "Free text — entities, causes, places, whatever doesn't fit above." },
  { id: "review", title: "Review your profile", subtitle: "This becomes your starting relevance graph." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { hydrated, profile, isGuest, authToken, updateProfileFields, addExplicitInterests, addServerInterests } =
    useAppStore();
  const { showToast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [movies, setMovies] = useState<string[]>([]);
  const [political, setPolitical] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && !profile) router.replace("/register");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const selectionByStep: Partial<Record<StepId, string[]>> = {
    sports,
    movies,
    political,
  };
  const isOptionalAndEmpty =
    (step.id === "sports" || step.id === "movies" || step.id === "political") &&
    (selectionByStep[step.id] ?? []).length === 0;

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  };

  const finish = async () => {
    updateProfileFields({
      hobbies,
      sports,
      movies,
      politicalInterests: political,
      otherInterests: other.trim(),
    });

    // Location and profession round out the Constellation display alongside
    // interests — for a real account these already live on the User record
    // itself (synced to Neo4j on register), so they're added locally only,
    // never sent as interest rows.
    const localOnlyItems: { label: string; type: InterestType }[] = [
      { label: profile.city, type: "place" },
      { label: profile.country, type: "place" },
    ];
    if (profile.profession) localOnlyItems.push({ label: profile.profession, type: "profession" });

    if (isGuest || !authToken) {
      // Guest sessions have no backend account — everything stays local, as before.
      addExplicitInterests([
        ...hobbies.map((h) => ({ label: h, type: "hobby" as InterestType })),
        ...interests.map((h) => ({ label: h, type: "topic" as InterestType })),
        ...sports.map((h) => ({ label: h, type: "sport" as InterestType })),
        ...movies.map((h) => ({ label: h, type: "movie" as InterestType })),
        ...political.map((h) => ({ label: h, type: "political" as InterestType })),
        ...localOnlyItems,
      ]);
      showToast("Profile mapped to your personal graph.");
      router.push("/discover");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const created = await api.addInterests(authToken, {
        hobbies,
        topics: interests,
        sports,
        movies,
        political_interests: political,
        other: other.trim(),
      });
      addServerInterests(created);
      addExplicitInterests(localOnlyItems);
      showToast("Profile mapped to your personal graph.");
      router.push("/discover");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="absolute left-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:left-6 sm:top-6 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="text-lg font-semibold">SignalArc</span>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            {step.optional && <span className="text-slate-400">Optional</span>}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{step.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step.subtitle}</p>

          <div className="mt-6">
            {step.id === "hobbies" && (
              <ChipSelector options={HOBBY_OPTIONS} selected={hobbies} onChange={setHobbies} customPlaceholder="Add a hobby…" />
            )}
            {step.id === "interests" && (
              <ChipSelector
                options={topicsByGroup("Interests")}
                selected={interests}
                onChange={setInterests}
                customPlaceholder="Add a topic…"
              />
            )}
            {step.id === "sports" && (
              <ChipSelector options={topicsByGroup("Sports")} selected={sports} onChange={setSports} customPlaceholder="Add a sport…" />
            )}
            {step.id === "movies" && (
              <ChipSelector
                options={topicsByGroup("Movies & Entertainment")}
                selected={movies}
                onChange={setMovies}
                customPlaceholder="Add a genre or show…"
              />
            )}
            {step.id === "political" && (
              <ChipSelector
                options={topicsByGroup("Political interests")}
                selected={political}
                onChange={setPolitical}
                customPlaceholder="Add a specific interest…"
              />
            )}
            {step.id === "other" && (
              <textarea
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="e.g. climate migration, Formula E, a specific company you're tracking — comma separated"
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            )}
            {step.id === "review" && (
              <ReviewSummary
                profile={profile}
                hobbies={hobbies}
                interests={interests}
                sports={sports}
                movies={movies}
                political={political}
                other={other}
              />
            )}
          </div>

          {error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0 || submitting} size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={goNext} size="sm" disabled={submitting}>
              {isLast ? (
                <>
                  {submitting ? "Saving…" : "Finish setup"}
                  <CheckCircle2 className="h-4 w-4" />
                </>
              ) : (
                <>
                  {isOptionalAndEmpty ? "Skip" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewSummary({
  profile,
  hobbies,
  interests,
  sports,
  movies,
  political,
  other,
}: {
  profile: { name: string; city: string; country: string; profession: string };
  hobbies: string[];
  interests: string[];
  sports: string[];
  movies: string[];
  political: string[];
  other: string;
}) {
  const groups: { label: string; values: string[]; tone: "indigo" | "teal" | "amber" | "violet" | "neutral" }[] = [
    { label: "Location & profession", values: [profile.city, profile.country, profile.profession].filter(Boolean), tone: "neutral" },
    { label: "Hobbies", values: hobbies, tone: "teal" },
    { label: "Interests", values: interests, tone: "indigo" },
    { label: "Sports", values: sports, tone: "amber" },
    { label: "Movies & entertainment", values: movies, tone: "violet" },
    { label: "Political interests", values: political, tone: "indigo" },
    { label: "Other", values: other ? other.split(",").map((s) => s.trim()).filter(Boolean) : [], tone: "neutral" },
  ];

  return (
    <div className="space-y-4">
      {groups.map((g) =>
        g.values.length > 0 ? (
          <div key={g.label}>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.values.map((v) => (
                <Tag key={v} tone={g.tone}>
                  {v}
                </Tag>
              ))}
            </div>
          </div>
        ) : null
      )}
      <p className="text-xs text-slate-400">
        Every item above becomes an explicit, editable connection in your Constellation — you can
        remove any of them later.
      </p>
    </div>
  );
}
