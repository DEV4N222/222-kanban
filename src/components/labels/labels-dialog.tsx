"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "./color-picker";
import { NewLabelForm } from "./new-label-form";
import { createLabel, deleteLabel, updateLabel } from "@/lib/actions/labels";
import type { LabelRow } from "@/lib/types";
import { Tag, Trash2 } from "lucide-react";

export function LabelsDialog({
  boardId,
  labels,
  usage,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  boardId: string;
  labels: LabelRow[];
  /** How many cards use each label, by label id. */
  usage: Map<string, number>;
  onCreated: (label: LabelRow) => void;
  onUpdated: (label: LabelRow) => void;
  onDeleted: (labelId: string) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Dragging the custom colour picker fires many changes; save once it settles.
  const pendingSaves = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function save(label: LabelRow, fields: Partial<Pick<LabelRow, "name" | "color">>) {
    const next = { ...label, ...fields };
    if (!next.name.trim()) return;
    if (next.name === label.name && next.color === label.color) return;
    onUpdated(next);

    clearTimeout(pendingSaves.current.get(label.id));
    pendingSaves.current.set(
      label.id,
      setTimeout(async () => {
        pendingSaves.current.delete(label.id);
        const result = await updateLabel(label.id, next.name, next.color);
        if (result.error) toast.error("Could not update label", { description: result.error });
      }, 400)
    );
  }

  async function remove(label: LabelRow) {
    setConfirmingId(null);
    clearTimeout(pendingSaves.current.get(label.id));
    onDeleted(label.id);
    const result = await deleteLabel(label.id);
    if (result.error) {
      onCreated(label);
      toast.error("Could not delete label", { description: result.error });
      return;
    }
    toast.success(`Label "${label.name}" deleted`);
  }

  return (
    <Dialog onOpenChange={(open) => !open && setConfirmingId(null)}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Tag className="size-4" />
        Labels
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No labels yet. Create one below, then add it to cards from the card panel.
            </p>
          )}
          {labels.map((label) => {
            const count = usage.get(label.id) ?? 0;
            return (
              <div key={label.id} className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="size-7 shrink-0 rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-foreground/30"
                        style={{ backgroundColor: label.color }}
                        aria-label={`Change colour of ${label.name}`}
                      />
                    }
                  />
                  <PopoverContent className="w-auto">
                    <ColorPicker value={label.color} onChange={(color) => save(label, { color })} />
                  </PopoverContent>
                </Popover>
                <Input
                  key={`${label.id}-${label.name}`}
                  defaultValue={label.name}
                  maxLength={40}
                  aria-label="Label name"
                  className="h-8"
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name) save(label, { name });
                    else e.target.value = label.name;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {count} {count === 1 ? "card" : "cards"}
                </span>
                {confirmingId === label.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="destructive" size="sm" onClick={() => remove(label)}>
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${label.name}`}
                    onClick={() => setConfirmingId(label.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          {confirmingId && (usage.get(confirmingId) ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Deleting removes this label from {usage.get(confirmingId)}{" "}
              {usage.get(confirmingId) === 1 ? "card" : "cards"}. The cards themselves stay.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">New label</p>
          <NewLabelForm
            onCreate={async (name, color) => {
              const result = await createLabel(boardId, name, color);
              if (result.error || !result.label) return result.error ?? "Could not create label.";
              onCreated(result.label);
              toast.success(`Label "${result.label.name}" created`);
              return null;
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
