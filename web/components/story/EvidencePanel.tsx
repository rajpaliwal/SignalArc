import { HelpCircle, RotateCcw, ScrollText } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Tag } from "@/components/ui/Tag";
import type { Story } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function EvidencePanel({ story }: { story: Story }) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Entities</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <EntityGroup label="People" values={story.people} tone="indigo" />
          <EntityGroup label="Organisations" values={story.organisations} tone="teal" />
          <EntityGroup label="Places" values={story.places} tone="amber" />
          <EntityGroup label="Topics" values={story.topics} tone="violet" />
        </div>
      </section>

      {story.decisions.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Decisions</h3>
          <div className="space-y-3">
            {story.decisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-sm text-slate-800 dark:text-slate-200">{d.text}</p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {d.decisionMaker} · effective {formatDate(d.effectiveDate)} · {d.scope}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {story.claims.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Claims</h3>
          <div className="space-y-3">
            {story.claims.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{c.text}</p>
                  <StatusPill status={c.status} className="shrink-0" />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Claimant: {c.claimant}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {story.outcomes.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Outcomes</h3>
          <div className="space-y-3">
            {story.outcomes.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{o.text}</p>
                  <StatusPill status={o.attributionStatus} className="shrink-0" />
                </div>
                {o.metric && <p className="mt-1.5 text-xs font-medium text-slate-500">{o.metric}</p>}
                <p className="mt-1 text-xs text-slate-400">Observed {formatDate(o.observedAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {story.disputed.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Disputed</h3>
          <div className="space-y-4">
            {story.disputed.map((d) => (
              <div key={d.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{d.topic}</p>
                <div className="mt-2 space-y-2">
                  {d.positions.map((pos, i) => (
                    <p key={i} className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Position {i + 1}: </span>
                      {pos.claim}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {story.unknowns.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <HelpCircle className="h-4 w-4 text-slate-400" />
            Unknowns
          </h3>
          <ul className="space-y-1.5">
            {story.unknowns.map((u, i) => (
              <li key={i} className="text-sm text-slate-500 dark:text-slate-400">
                · {u}
              </li>
            ))}
          </ul>
        </section>
      )}

      {story.corrections.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <RotateCcw className="h-4 w-4 text-rose-500" />
            Correction history
          </h3>
          <div className="space-y-2">
            {story.corrections.map((c) => (
              <div key={c.id} className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-300">
                <span className="font-medium">{formatDate(c.date)}: </span>
                {c.text}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <ScrollText className="h-4 w-4 text-slate-400" />
          Sources
        </h3>
        <div className="space-y-2">
          {story.sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {s.isPrimary && <Tag tone="teal">Primary</Tag>}
                {formatDate(s.publishedAt)}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function EntityGroup({ label, values, tone }: { label: string; values: string[]; tone: "indigo" | "teal" | "amber" | "violet" }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Tag key={v} tone={tone}>
            {v}
          </Tag>
        ))}
      </div>
    </div>
  );
}
