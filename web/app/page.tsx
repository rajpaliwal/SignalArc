"use client";

import {
  ArrowRight,
  BellOff,
  Eye,
  GitBranch,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { useAppStore } from "@/lib/store";

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Explain first",
    body: "Every story shows why it appeared and what changed — never a black-box feed.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence beside claims",
    body: "Sources are one click away. Confirmed, reported, disputed and unknown are distinct states.",
  },
  {
    icon: BellOff,
    title: "Quiet by default",
    body: "Notifications correspond to material change, not publication volume.",
  },
  {
    icon: GitBranch,
    title: "Uncertainty is a feature",
    body: "Disputed claims and unknowns are shown, not smoothed over.",
  },
];

const STEPS = [
  {
    title: "Tell us what matters",
    body: "Hobbies, interests, location, sports, movies, political interests and profession — as explicit as you want it to be.",
  },
  {
    title: "We map the world to you",
    body: "Every conversation and follow quietly refines a personal relevance graph you can inspect and edit at any time.",
  },
  {
    title: "Follow stories, get real updates",
    body: "Cited timelines, evidence you can check, and notifications only when something material actually changes.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { hydrated, profile, startGuestExploration } = useAppStore();
  const hasProfile = hydrated && !!profile;

  const handleExplore = () => {
    startGuestExploration();
    router.push("/discover");
  };

  return (
    <div className="flex-1">
      <TopNav />

      <section className="bg-constellation relative overflow-hidden px-6 py-20 text-white sm:py-28">
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Product prototype · static frontend
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            SignalArc
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300 sm:text-xl">
            An evidence-backed map of the world, personalised around you.
          </p>
          <p className="mt-6 max-w-xl text-sm text-slate-400">
            Discover what&apos;s changing in the world that matters to you, understand how it
            developed, and stay updated without reading twenty versions of the same story.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={hasProfile ? "/discover" : "/register"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400"
            >
              {hasProfile ? "Go to your feed" : "Get started"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!hasProfile && (
              <button
                onClick={handleExplore}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                Explore without an account
              </button>
            )}
          </div>
          <Link
            href="/sitemap"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            View all pages in this prototype
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ConstellationHero />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {i + 1}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 px-6 py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-white">
            Experience principles
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <p.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <MessageCircle className="mx-auto h-8 w-8 text-indigo-500" />
        <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          Talk to it like you would a well-read friend
        </h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Mention what you care about in chat and SignalArc quietly decides whether it was a
          passing comment or a genuine interest worth remembering — and shows you exactly why.
        </p>
        <Link
          href={hasProfile ? "/chat" : "/register"}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Try the chat interface
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function ConstellationHero() {
  const nodes = [
    { x: 20, y: 30, r: 5, color: "#818cf8" },
    { x: 78, y: 22, r: 5, color: "#2dd4bf" },
    { x: 12, y: 72, r: 4, color: "#2dd4bf" },
    { x: 85, y: 68, r: 4, color: "#818cf8" },
    { x: 50, y: 15, r: 3, color: "#64748b" },
    { x: 92, y: 40, r: 3, color: "#64748b" },
    { x: 8, y: 45, r: 3, color: "#64748b" },
  ];
  const center = { x: 50, y: 48 };

  return (
    // preserveAspectRatio="none" maps each axis independently to the
    // container's actual (wide, short) box — "slice"/"meet" would instead
    // scale both axes by the larger ratio, blowing small radii up several
    // times over and dropping a giant circle behind the hero title.
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {nodes.slice(0, 4).map((n, i) => (
        <line
          key={i}
          x1={center.x}
          y1={center.y}
          x2={n.x}
          y2={n.y}
          stroke="#6366f1"
          strokeWidth="0.15"
          opacity="0.4"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r * 0.5} fill={n.color} opacity="0.8" />
      ))}
    </svg>
  );
}
