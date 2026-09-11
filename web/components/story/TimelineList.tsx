import { StatusPill } from "@/components/StatusPill";
import type { Source, TimelineEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function TimelineList({ events, sources }: { events: TimelineEvent[]; sources: Source[] }) {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const ordered = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-800">
      {ordered.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-950" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{formatDate(event.date)}</span>
            <StatusPill status={event.status} />
            {event.isLatest && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
          {event.sourceIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {event.sourceIds.map((sid) => {
                const source = sourceById.get(sid);
                if (!source) return null;
                return (
                  <a
                    key={sid}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {source.name}
                    {source.isPrimary ? " · primary" : ""}
                  </a>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
