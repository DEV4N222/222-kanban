"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Workspace name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    return { error: workspaceError?.message ?? "Could not create workspace." };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect(`/w/${workspace.id}`);
}

// Owner-only: the workspaces_update_owner policy only lets the owner update
// the row, so anyone else's request changes nothing.
export async function renameWorkspace(workspaceId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the workspace a name." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Only the workspace owner can rename it." };

  // The name shows in the header of every page in the workspace.
  revalidatePath(`/w/${workspaceId}`, "layout");
  return { success: true, name };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { _token: token });

  if (error) {
    return { error: error.message };
  }

  redirect(`/w/${data}`);
}
