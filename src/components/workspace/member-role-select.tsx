"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setMemberRole } from "@/lib/actions/invites";

type Role = "admin" | "member";
const LABELS: Record<Role, string> = { admin: "Admin", member: "Member" };

export function MemberRoleSelect({
  workspaceId,
  userId,
  name,
  role: initialRole,
}: {
  workspaceId: string;
  userId: string;
  name: string;
  role: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [pending, setPending] = useState(false);

  async function change(next: Role) {
    if (next === role) return;
    const previous = role;
    setRole(next);
    setPending(true);
    const result = await setMemberRole(workspaceId, userId, next);
    setPending(false);
    if (result.error) {
      setRole(previous);
      toast.error("Couldn't change role", { description: result.error });
      return;
    }
    toast.success(`${name} is now ${next === "admin" ? "an admin" : "a member"}`);
  }

  return (
    <Select value={role} onValueChange={(value) => change(value as Role)} disabled={pending}>
      <SelectTrigger className="h-7 w-28 text-xs" aria-label={`Role for ${name}`}>
        <SelectValue>{(value: Role) => LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="member">Member</SelectItem>
      </SelectContent>
    </Select>
  );
}
