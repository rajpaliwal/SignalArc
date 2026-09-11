import { AlertTriangle, CheckCircle2, HelpCircle, RotateCcw, Sparkles, Users } from "lucide-react";
import type { EvidenceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  EvidenceStatus,
  { label: string; classes: string; icon: typeof CheckCircle2 }
> = {
  observed: {
    label: "Confirmed",
    classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  reported: {
    label: "Reported",
    classes: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    icon: Users,
  },
  corroborated: {
    label: "Corroborated",
    classes: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    icon: CheckCircle2,
  },
  disputed: {
    label: "Disputed",
    classes: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    icon: AlertTriangle,
  },
  corrected: {
    label: "Corrected",
    classes: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    icon: RotateCcw,
  },
  scenario: {
    label: "Scenario",
    classes: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    icon: Sparkles,
  },
};

export function StatusPill({ status, className }: { status: EvidenceStatus; className?: string }) {
  const config = CONFIG[status] ?? CONFIG.reported;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        config.classes,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function UnknownPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400",
        className
      )}
    >
      <HelpCircle className="h-3 w-3" />
      Unknown
    </span>
  );
}
