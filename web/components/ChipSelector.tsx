"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChipSelectorProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function ChipSelector({
  options,
  selected,
  onChange,
  allowCustom = true,
  customPlaceholder = "Add your own…",
}: ChipSelectorProps) {
  const [customValue, setCustomValue] = useState("");

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const addCustom = () => {
    const value = customValue.trim();
    if (!value) return;
    if (!selected.includes(value)) onChange([...selected, value]);
    setCustomValue("");
  };

  const customSelected = selected.filter((s) => !options.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              {option}
            </button>
          );
        })}
        {customSelected.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-600 bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white"
          >
            {option}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="mt-3 flex max-w-xs items-center gap-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={customPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Add"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
