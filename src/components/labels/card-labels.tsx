"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewLabelForm } from "./new-label-form";
import { labelTextColor } from "@/lib/labels";
import { createLabel } from "@/lib/actions/labels";
import { setCardLabels } from "@/lib/actions/cards";
import type { LabelRow } from "@/lib/types";
import { Check, Plus } from "lucide-react";

export function CardLabels({
  cardId,
  boardId,
  labels,
  selectedIds,
  onChange,
  onLabelCreated,
}: {
  cardId: string;
  boardId: string;
  labels: LabelRow[];
  selectedIds: string[];
  onChange: (labelIds: string[]) => void;
  onLabelCreated: (label: LabelRow) => void;
}) {
  const [creating, setCreating] = useState(false);

  function apply(nextIds: string[]) {
    onChange(nextIds);
    setCardLabels(cardId, nextIds);
  }

  return (
    <div className="space-y-2">
      <Label>Labels</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {labels.map((label) => {
          const active = selectedIds.includes(label.id);
          return (
            <button
              key={label.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                apply(active ? selectedIds.filter((id) => id !== label.id) : [...selectedIds, label.id])
              }
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: label.color, borderColor: label.color, color: labelTextColor(label.color) }
                  : undefined
              }
            >
              {active ? (
                <Check className="size-3" />
              ) : (
                <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
              )}
              {label.name}
            </button>
          );
        })}

        <Popover open={creating} onOpenChange={setCreating}>
          <PopoverTrigger render={<Button variant="ghost" size="xs" className="text-muted-foreground" />}>
            <Plus className="size-3" />
            New label
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <NewLabelForm
              submitLabel="Create & add"
              onCreate={async (name, color) => {
                const result = await createLabel(boardId, name, color);
                if (result.error || !result.label) return result.error ?? "Could not create label.";
                onLabelCreated(result.label);
                apply([...selectedIds, result.label.id]);
                setCreating(false);
                toast.success(`Label "${result.label.name}" added`);
                return null;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {labels.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No labels on this board yet — create one to tag cards like &ldquo;Bug&rdquo; or &ldquo;Client&rdquo;.
        </p>
      )}
    </div>
  );
}
