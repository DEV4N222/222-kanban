"use server";

import { createClient } from "@/lib/supabase/server";
import type { SprintStatus } from "@/lib/db/types";

export async function createSprint(boardId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const goal = String(formData.get("goal") ?? "").trim() || null;

  if (!name || !start_date || !end_date) {
    return { error: "Name, start date, and end date are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sprints")
    .insert({ board_id: boardId, name, start_date, end_date, goal })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { success: true, sprint: data };
}

export async function setSprintStatus(sprintId: string, status: SprintStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("sprints").update({ status }).eq("id", sprintId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteSprint(sprintId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
  if (error) return { error: error.message };
  return { success: true };
}
