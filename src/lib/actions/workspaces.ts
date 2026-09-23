"use server";

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

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { _token: token });

  if (error) {
    return { error: error.message };
  }

  redirect(`/w/${data}`);
}
