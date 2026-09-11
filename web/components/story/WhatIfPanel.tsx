"use client";

import { AlertOctagon, Send, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Tag } from "@/components/ui/Tag";
import { predictWhatIf } from "@/lib/predict";
import { useToast } from "@/lib/toast";
import type { Story, WhatIfExchange } from "@/lib/types";
import { formatRelativeTime, uid } from "@/lib/utils";

const CONFIDENCE_TONE: Record<WhatIfExchange["confidence"], "emerald" | "amber" | "rose"> = {
  high: "emerald",
  medium: "amber",
  low: "rose",
};

export function WhatIfPanel({
  story,
  history,
  onAsk,
  predict,
}: {
  story: Story;
  history: WhatIfExchange[];
  onAsk: (exchange: WhatIfExchange) => void;
  /** When set, questions are answered by the real, grounded backend
   * (article context + a fresh web search) instead of the local heuristic —
   * used for real stories fetched from the news pipeline. */
  predict?: (question: string) => Promise<{ scenario: string; assumptions: string[]; confidence: WhatIfExchange["confidence"] }>;
}) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const { showToast } = useToast();

  const ask = async (q: string) => {
    if (!q.trim() || asking) return;
    setAsking(true);
    try {
      const prediction = predict ? await predict(q) : predictWhatIf(story, q);
      onAsk({
        id: uid("wi"),
        question: q.trim(),
        assumptions: prediction.assumptions,
        scenario: prediction.scenario,
        confidence: prediction.confidence,
        createdAt: new Date().toISOString(),
      });
      setQuestion("");
    } catch {
      showToast("Couldn't answer that one — try again in a moment.", "info");
    } finally {
      setAsking(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(question);
  };

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3.5 text-xs text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/5 dark:text-violet-300">
        <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Scenarios are hypothetical extrapolations under stated assumptions — never displayed as
        fact, and always separate from the confirmed timeline.
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a what-if question about this story…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          aria-label="Ask"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {story.whatIfSeeds.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {story.whatIfSeeds.map((seed) => (
            <button
              key={seed.question}
              disabled={asking}
              onClick={() => void ask(seed.question)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              {seed.question}
            </button>
          ))}
        </div>
      )}

      {asking && <p className="mt-3 text-xs text-slate-400">Thinking this through…</p>}

      <div className="mt-6 space-y-4">
        {[...history].reverse().map((exchange) => (
          <div key={exchange.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{exchange.question}</p>
            <div className="mt-2 flex items-center gap-2">
              <Tag tone={CONFIDENCE_TONE[exchange.confidence]}>{exchange.confidence} confidence</Tag>
              <span className="text-xs text-slate-400">{formatRelativeTime(exchange.createdAt)}</span>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
              <p className="text-sm text-slate-600 dark:text-slate-300">{exchange.scenario}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-slate-400">Assumptions</p>
              <ul className="mt-1 space-y-0.5">
                {exchange.assumptions.map((a, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                    · {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-sm text-slate-400">No what-if questions asked yet — try one of the suggestions above.</p>
        )}
      </div>
    </div>
  );
}
