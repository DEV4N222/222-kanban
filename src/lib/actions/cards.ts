"use server";

import { createClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createCard(boardId: string, columnId: string, title: string) {
  const supabase = await createClient();
  const userId = await currentUserId();

  const { data: siblings } = await supabase
    .from("cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1);

  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0;

  const { data: card, error } = await supabase
    .from("cards")
    .insert({ board_id: boardId, column_id: columnId, title, position, created_by: userId })
    .select("id")
    .single();

  if (error || !card) return { error: error?.message ?? "Could not create card." };

  await supabase.from("card_events").insert({
    card_id: card.id,
    board_id: boardId,
    event_type: "created",
    to_column_id: columnId,
    actor_id: userId,
  });

  return { success: true, id: card.id };
}

export async function moveCard(input: {
  cardId: string;
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  newIndex: number;
}) {
  const { cardId, boardId, fromColumnId, toColumnId, newIndex } = input;
  const supabase = await createClient();
  const userId = await currentUserId();

  const { data: siblings } = await supabase
    .from("cards")
    .select("id, position")
    .eq("column_id", toColumnId)
    .neq("id", cardId)
    .order("position", { ascending: true });

  if (!siblings) return { error: "Could not load column." };

  const position = computePosition(siblings, newIndex);

  const { error } = await supabase
    .from("cards")
    .update({ column_id: toColumnId, position })
    .eq("id", cardId);

  if (error) return { error: error.message };

  if (fromColumnId !== toColumnId) {
    await supabase.from("card_events").insert({
      card_id: cardId,
      board_id: boardId,
      event_type: "moved",
      from_column_id: fromColumnId,
      to_column_id: toColumnId,
      actor_id: userId,
    });
  }

  return { success: true };
}

function computePosition(siblings: { position: number }[], index: number): number {
  if (siblings.length === 0) return 0;
  if (index <= 0) return siblings[0].position - 1;
  if (index >= siblings.length) return siblings[siblings.length - 1].position + 1;
  return (siblings[index - 1].position + siblings[index].position) / 2;
}

export async function updateCard(
  cardId: string,
  fields: {
    title?: string;
    description?: string | null;
    assignee_id?: string | null;
    due_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").update(fields).eq("id", cardId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function archiveCard(cardId: string, boardId: string) {
  const supabase = await createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("cards").update({ archived: true }).eq("id", cardId);
  if (error) return { error: error.message };

  await supabase.from("card_events").insert({
    card_id: cardId,
    board_id: boardId,
    event_type: "archived",
    actor_id: userId,
  });

  return { success: true };
}

export async function unarchiveCard(cardId: string, boardId: string) {
  const supabase = await createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("cards").update({ archived: false }).eq("id", cardId);
  if (error) return { error: error.message };

  await supabase.from("card_events").insert({
    card_id: cardId,
    board_id: boardId,
    event_type: "unarchived",
    actor_id: userId,
  });

  return { success: true };
}

export async function deleteCard(cardId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().eq("id", cardId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function setCardLabels(cardId: string, labelIds: string[]) {
  const supabase = await createClient();
  await supabase.from("card_labels").delete().eq("card_id", cardId);
  if (labelIds.length > 0) {
    const { error } = await supabase
      .from("card_labels")
      .insert(labelIds.map((label_id) => ({ card_id: cardId, label_id })));
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function assignCardToSprint(cardId: string, boardId: string, sprintId: string | null) {
  const supabase = await createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("cards").update({ sprint_id: sprintId }).eq("id", cardId);
  if (error) return { error: error.message };

  await supabase.from("card_events").insert({
    card_id: cardId,
    board_id: boardId,
    event_type: sprintId ? "sprint_added" : "sprint_removed",
    sprint_id: sprintId,
    actor_id: userId,
  });

  return { success: true };
}
