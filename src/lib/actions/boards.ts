"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_COLUMNS = [
  { name: "Backlog", position: 0, is_done: false },
  { name: "To Do", position: 1, is_done: false },
  { name: "In Progress", position: 2, is_done: false },
  { name: "Review", position: 3, is_done: false },
  { name: "Done", position: 4, is_done: true },
];

export async function createBoard(workspaceId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Board name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({ workspace_id: workspaceId, name, created_by: user.id })
    .select("id")
    .single();

  if (boardError || !board) {
    return { error: boardError?.message ?? "Could not create board." };
  }

  const { error: columnsError } = await supabase
    .from("columns")
    .insert(DEFAULT_COLUMNS.map((c) => ({ ...c, board_id: board.id })));

  if (columnsError) {
    return { error: columnsError.message };
  }

  redirect(`/w/${workspaceId}/b/${board.id}`);
}

export async function renameBoard(boardId: string, workspaceId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("boards").update({ name }).eq("id", boardId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}

export async function deleteBoard(boardId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}
