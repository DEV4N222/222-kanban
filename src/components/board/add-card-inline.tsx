"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

export function AddCardInline({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setEditing(true)}
      >
        <Plus className="size-4" />
        Add card
      </Button>
    );
  }

  function submit() {
    const trimmed = title.trim();
    if (trimmed) onAdd(trimmed);
    setTitle("");
    setEditing(false);
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
