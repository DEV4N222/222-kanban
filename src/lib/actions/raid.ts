"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RaidLevel, RaidStatus, RaidType } from "@/lib/db/types";

const TYPES: RaidType[] = ["risk", "assumption", "issue", "decision"];
const STATUSES: RaidStatus[] = ["open", "in_progress", "closed"];
const LEVELS: RaidLevel[] = ["low", "medium", "high"];

function pick<T extends string>(value: FormDataEntryValue | null, allowed: T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

// "__none__" is what the form's selects submit for "no value".
function text(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed && trimmed !== "__none__" ? trimmed : null;
}

function readType(formData: FormData) {
  return pick(formData.get("type"), TYPES);
}

function readFields(formData: FormData, type: RaidType | null) {
  return {
    title: text(formData.get("title")),
    description: text(formData.get("description")),
    owner_id: text(formData.get("owner_id")),
    status: pick(formData.get("status"), STATUSES) ?? "open",
    impact: pick(formData.get("impact"), LEVELS),
    likelihood: type === "risk" ? pick(formData.get("likelihood"), LEVELS) : null,
    action: text(formData.get("action")),
    due_date: text(formData.get("due_date")),
  };
}

export async function createRaidItem(workspaceId: string, boardId: string, formData: FormData) {
  const type = readType(formData);
  const { title, ...fields } = readFields(formData, type);
  if (!type || !title) return { error: "Type and title are required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Numbers are per board and type (R-1, R-2 …). Retry once if someone else
  // took the same number at the same moment.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: last } = await supabase
      .from("raid_items")
      .select("number")
      .eq("board_id", boardId)
      .eq("type", type)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("raid_items").insert({
      board_id: boardId,
      type,
      number: (last?.number ?? 0) + 1,
      title,
      ...fields,
      created_by: user?.id ?? null,
    });

    if (!error) {
      revalidatePath(`/w/${workspaceId}/b/${boardId}/raid`);
      return { success: true };
    }
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not save — please try again." };
}

export async function updateRaidItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
  formData: FormData
) {
  // Type (and so the reference number) is fixed once an item exists; the
  // submitted type only decides whether likelihood applies.
  const { title, ...fields } = readFields(formData, readType(formData));
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("raid_items")
    .update({ title, ...fields, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return { error: error.message };
  revalidatePath(`/w/${workspaceId}/b/${boardId}/raid`);
  return { success: true };
}

export async function deleteRaidItem(workspaceId: string, boardId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("raid_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/w/${workspaceId}/b/${boardId}/raid`);
  return { success: true };
}
