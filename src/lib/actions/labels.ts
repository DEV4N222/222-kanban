"use server";

import { createClient } from "@/lib/supabase/server";

export async function createLabel(boardId: string, name: string, color: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert({ board_id: boardId, name, color })
    .select("id, name, color")
    .single();
  if (error) return { error: error.message };
  return { success: true, label: data };
}

export async function deleteLabel(labelId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().eq("id", labelId);
  if (error) return { error: error.message };
  return { success: true };
}
