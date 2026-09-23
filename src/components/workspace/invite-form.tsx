"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvite } from "@/lib/actions/invites";

type ActionState = { error?: string; success?: boolean } | null;

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => (await createInvite(workspaceId, formData)) ?? null,
    null
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px] space-y-1">
        <Input name="email" type="email" placeholder="teammate@company.com" required />
      </div>
      <Select name="role" defaultValue="member">
        <SelectTrigger className="w-28">
          <SelectValue>
            {(value: string) => ({ member: "Member", admin: "Admin" })[value] ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting..." : "Invite"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
