"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameWorkspace } from "@/lib/actions/workspaces";

type ActionState = { error?: string; success?: boolean; name?: string } | null;

export function RenameWorkspaceForm({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [value, setValue] = useState(name);
  const [saved, setSaved] = useState(name);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    const result = (await renameWorkspace(workspaceId, formData)) ?? null;
    if (result?.success && result.name) {
      setSaved(result.name);
      setValue(result.name);
      toast.success(`Workspace renamed to "${result.name}"`);
    }
    return result;
  }, null);

  const unchanged = value.trim() === saved || !value.trim();

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <Input
        name="name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={60}
        required
        aria-label="Workspace name"
        className="min-w-[200px] flex-1"
      />
      <Button type="submit" disabled={pending || unchanged}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
