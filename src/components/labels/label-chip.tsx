import { labelTextColor } from "@/lib/labels";
import type { LabelRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LabelChip({
  label,
  className,
}: {
  label: Pick<LabelRow, "name" | "color">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
    >
      {label.name}
    </span>
  );
}
