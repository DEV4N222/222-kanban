"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

export function NewColumnForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!editing) {
    return (
      <Button
        variant="ghost"
        className="h-fit w-72 shrink-0 justify-start text-muted-foreground"
        onClick={() => setEditing(true)}
      >
        <Plus className="size-4" />
        Add column
      </Button>
    );
  }

  function submit() {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setName("");
    setEditing(false);
  }

  return (
    <div className="w-72 shrink-0 space-y-2 rounded-lg bg-muted/40 p-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Column name"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
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
