"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./color-picker";
import { LabelChip } from "./label-chip";
import { DEFAULT_LABEL_COLOR } from "@/lib/labels";

export function NewLabelForm({
  onCreate,
  submitLabel = "Create label",
}: {
  onCreate: (name: string, color: string) => Promise<string | null>;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_LABEL_COLOR);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Give the label a name.");
      return;
    }
    setPending(true);
    const failure = await onCreate(name.trim(), color);
    setPending(false);
    if (failure) {
      setError(failure);
      return;
    }
    setName("");
    setError(null);
  }

  return (
    <div className="space-y-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Label name, e.g. Bug"
        maxLength={40}
        aria-label="Label name"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex items-center justify-between gap-2">
        <LabelChip label={{ name: name.trim() || "Preview", color }} />
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
