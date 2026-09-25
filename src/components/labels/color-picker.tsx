"use client";

import { LABEL_COLORS, labelTextColor } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Check, Pipette } from "lucide-react";

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const isCustom = !LABEL_COLORS.some((c) => c.value === value.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Label colour">
      {LABEL_COLORS.map((c) => {
        const selected = c.value === value.toLowerCase();
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
              selected ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-foreground/30"
            )}
            style={{ backgroundColor: c.value }}
          >
            {selected && <Check className="size-3.5" style={{ color: labelTextColor(c.value) }} />}
          </button>
        );
      })}
      <label
        title="Custom colour"
        className={cn(
          "relative flex size-7 cursor-pointer items-center justify-center rounded-full border ring-offset-2 ring-offset-background",
          isCustom ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-foreground/30"
        )}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        <Pipette
          className="size-3.5"
          style={{ color: isCustom ? labelTextColor(value) : undefined }}
        />
        <span className="sr-only">Custom colour</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
