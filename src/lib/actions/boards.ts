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

// Archive / restore: owners and admins only (enforced by the
// guard_board_archiving trigger; see 0008_archive_boards.sql).
export async function archiveBoard(boardId: string, workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("boards")
    .update({ archived_at: new Date().toISOString(), archived_by: user?.id ?? null })
    .eq("id", boardId);
  if (error) return { error: archiveError(error.message) };
  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}

export async function restoreBoard(boardId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({ archived_at: null, archived_by: null })
    .eq("id", boardId);
  if (error) return { error: archiveError(error.message) };
  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}

function archiveError(message: string) {
  return /only workspace owners and admins/i.test(message)
    ? "Only workspace owners and admins can archive or restore boards."
    : message;
}

// Permanent: removes the board with its columns, cards, sprints, RAID log
// and retros. The database only allows it for archived boards, and only for
// owners and admins; the name must be typed to confirm.
export async function deleteArchivedBoard(boardId: string, workspaceId: string, confirmName: string) {
  const supabase = await createClient();

  const { data: board } = await supabase.from("boards").select("name, archived_at").eq("id", boardId).maybeSingle();
  if (!board) return { error: "That board wasn't found." };
  if (!board.archived_at) return { error: "Archive the board before deleting it." };
  if (confirmName.trim() !== board.name.trim()) return { error: "Type the board's name exactly to confirm." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (me?.role !== "owner" && me?.role !== "admin") {
    return { error: "Only workspace owners and admins can permanently delete boards." };
  }

  // Card images live in storage, and storage permissions are checked against
  // the board, so remove them while the board still exists.
  const { data: attachments } = await supabase.from("card_attachments").select("path").eq("board_id", boardId);
  const paths = (attachments ?? []).map((a) => a.path);
  if (paths.length > 0) await supabase.storage.from("card-images").remove(paths);

  const { data: deleted, error } = await supabase.from("boards").delete().eq("id", boardId).select("id");
  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    return { error: "Only workspace owners and admins can permanently delete boards." };
  }

  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}
