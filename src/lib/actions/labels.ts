"use server";

import { createClient } from "@/lib/supabase/server";
import { isHexColor } from "@/lib/labels";

type Clean = { ok: true; name: string; color: string } | { ok: false; error: string };

function clean(name: string, color: string): Clean {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return { ok: false, error: "Give the label a name." };
  if (!isHexColor(color)) return { ok: false, error: "Pick a colour." };
  return { ok: true, name: trimmed, color: color.toLowerCase() };
}

export async function createLabel(boardId: string, name: string, color: string) {
  const fields = clean(name, color);
  if (!fields.ok) return { error: fields.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert({ board_id: boardId, name: fields.name, color: fields.color })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { success: true, label: data };
}

export async function updateLabel(labelId: string, name: string, color: string) {
  const fields = clean(name, color);
  if (!fields.ok) return { error: fields.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("labels")
    .update({ name: fields.name, color: fields.color })
    .eq("id", labelId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteLabel(labelId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().eq("id", labelId);
  if (error) return { error: error.message };
  return { success: true };
}
