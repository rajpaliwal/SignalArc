import { ChevronDown, type LucideIcon } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon;
}

/** A `<select>` styled to match the rest of the UI kit (Button, Field, Tag)
 * — an optional leading icon plus a consistent chevron, reused anywhere a
 * plain filter dropdown would otherwise look bare. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, icon: Icon, ...props }, ref) => (
  <div className="relative">
    {Icon && <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />}
    <select
      ref={ref}
      className={cn(
        "appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-7 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600",
        Icon ? "pl-8" : "pl-3",
        className
      )}
      {...props}
    />
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
  </div>
));
Select.displayName = "Select";
