"use server";

import { createClient } from "@/lib/supabase/server";

// No revalidatePath here by design: the board view keeps its own optimistic
// client state and every other viewer picks up changes via the Supabase
// Realtime subscription on `columns`/`cards`/`card_events`.

export async function createColumn(boardId: string, name: string) {
  const supabase = await createClient();

  const { data: siblings } = await supabase
    .from("columns")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1);

  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0;

  const { error } = await supabase.from("columns").insert({ board_id: boardId, name, position });
  if (error) return { error: error.message };
  return { success: true };
}

export async function renameColumn(columnId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("columns").update({ name }).eq("id", columnId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateColumnSettings(
  columnId: string,
  fields: { is_done?: boolean; wip_limit?: number | null }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("columns").update(fields).eq("id", columnId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteColumn(columnId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("columns").delete().eq("id", columnId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function reorderColumn(columnId: string, boardId: string, newIndex: number) {
  const supabase = await createClient();

  const { data: siblings } = await supabase
    .from("columns")
    .select("id, position")
    .eq("board_id", boardId)
    .neq("id", columnId)
    .order("position", { ascending: true });

  if (!siblings) return { error: "Could not load columns." };

  const position = computePosition(siblings, newIndex);

  const { error } = await supabase.from("columns").update({ position }).eq("id", columnId);
  if (error) return { error: error.message };
  return { success: true };
}

function computePosition(siblings: { position: number }[], index: number): number {
  if (siblings.length === 0) return 0;
  if (index <= 0) return siblings[0].position - 1;
  if (index >= siblings.length) return siblings[siblings.length - 1].position + 1;
  return (siblings[index - 1].position + siblings[index].position) / 2;
}
