import type { RelevanceResult } from "@/lib/types";

export function RelevanceExplain({ relevance }: { relevance: RelevanceResult }) {
  const positive = relevance.components.filter((c) => c.contribution > 0);

  return (
    <div className="space-y-2.5">
      {positive.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Shown for topical diversity — it doesn&apos;t strongly match your current profile yet.
        </p>
      )}
      {positive.map((c) => (
        <div key={c.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">{c.label}</span>
            <span className="text-slate-400">{c.reason}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, c.contribution * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
