import { Ban, Brain, Clock } from "lucide-react";
import type { ChatExtraction } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<ChatExtraction["verdict"], { icon: typeof Brain; classes: string; label: (topic: string) => string }> = {
  interested: {
    icon: Brain,
    classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    label: (topic) => `Saved to graph: ${topic}`,
  },
  temporary: {
    icon: Clock,
    classes: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    label: (topic) => `Casual mention, not saved: ${topic}`,
  },
  negative: {
    icon: Ban,
    classes: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    label: (topic) => `Muted: ${topic}`,
  },
  none: {
    icon: Clock,
    classes: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    label: () => "No topic detected",
  },
};

export function ExtractionBadge({ extraction }: { extraction: ChatExtraction }) {
  const config = CONFIG[extraction.verdict];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.classes)}>
      <Icon className="h-3 w-3" />
      {config.label(extraction.topic)}
      {extraction.verdict !== "none" && <span className="opacity-70">· {Math.round(extraction.confidence * 100)}%</span>}
    </span>
  );
}
