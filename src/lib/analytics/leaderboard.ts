import type { CardEventRow, CardRow, ColumnRow, MemberWithProfile } from "@/lib/types";

export type LeaderboardEntry = { userId: string | null; name: string; completed: number };

// A card counts as completed for a sprint when it is assigned to that sprint,
// not archived, and sits in an `is_done` column. It is credited to its assignee;
// an unassigned card goes to whoever last moved it into a done column.
export function computeLeaderboard(
  cards: Pick<CardRow, "id" | "column_id" | "sprint_id" | "assignee_id" | "archived">[],
  events: CardEventRow[],
  columns: ColumnRow[],
  members: MemberWithProfile[],
  sprintId: string
): LeaderboardEntry[] {
  const doneColumnIds = new Set(columns.filter((c) => c.is_done).map((c) => c.id));

  const lastDoneMover = new Map<string, string | null>();
  for (const event of events) {
    if (event.event_type === "moved" && event.to_column_id && doneColumnIds.has(event.to_column_id)) {
      lastDoneMover.set(event.card_id, event.actor_id);
    }
  }

  const counts = new Map<string | null, number>();
  for (const card of cards) {
    if (card.sprint_id !== sprintId || card.archived || !doneColumnIds.has(card.column_id)) continue;
    const userId = card.assignee_id ?? lastDoneMover.get(card.id) ?? null;
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }

  const names = new Map(members.map((m) => [m.user_id, m.profiles?.name ?? "Unknown member"]));

  return [...counts.entries()]
    .map(([userId, completed]) => ({
      userId,
      name: userId ? names.get(userId) ?? "Former member" : "Unassigned",
      completed,
    }))
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
}
