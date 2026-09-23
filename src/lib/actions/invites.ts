"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InviteRole } from "@/lib/db/types";

export async function createInvite(workspaceId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role: InviteRole = formData.get("role") === "admin" ? "admin" : "member";

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invites")
    .insert({ workspace_id: workspaceId, email, role, invited_by: user?.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/w/${workspaceId}/settings`);
  return { success: true };
}

// Used directly as a <form action>, so this returns void rather than a
// state object (form actions can't return a value to display).
export async function revokeInvite(inviteId: string, workspaceId: string) {
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", inviteId);
  revalidatePath(`/w/${workspaceId}/settings`);
}

// Used directly as a <form action>, so this returns void rather than a
// state object (form actions can't return a value to display).
export async function removeMember(workspaceId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  revalidatePath(`/w/${workspaceId}/settings`);
}
