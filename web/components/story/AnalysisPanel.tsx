import { AlertTriangle, Compass, TrendingUp, Zap } from "lucide-react";
import type { Story } from "@/lib/types";

export function AnalysisPanel({ story }: { story: Story }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Summary</h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{story.analysis.summary}</p>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <Zap className="h-4 w-4 text-indigo-500" />
          Key drivers
        </h3>
        <ul className="space-y-1.5">
          {story.analysis.keyDrivers.map((d, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Risks
        </h3>
        <ul className="space-y-1.5">
          {story.analysis.risks.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Outlook
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{story.analysis.outlook}</p>
      </section>

      <section className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
        <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Analysis is generated from validated story objects — events, decisions and claims — never
        from raw article text directly.
      </section>
    </div>
  );
}
