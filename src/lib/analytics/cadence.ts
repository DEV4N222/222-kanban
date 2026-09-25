import type { CardEventRow, CardRow, ColumnRow, SprintRow } from "@/lib/types";

export type CadencePoint = {
  sprintId: string;
  sprint: string;
  /** Average days from joining the sprint to reaching Done; null when nothing is done yet. */
  averageDays: number | null;
  completed: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Squad cadence: for each sprint, the average time its completed cards took.
// A card's clock starts when it was added to the sprint (or when it was
// created, if later) and stops the last time it entered an `is_done`
// column. Completed means the same as the burndown and gamification charts:
// in the sprint, not archived, and currently in a done column.
export function computeCadence(
  cards: Pick<CardRow, "id" | "column_id" | "sprint_id" | "archived" | "created_at">[],
  events: CardEventRow[],
  columns: ColumnRow[],
  sprints: SprintRow[]
): CadencePoint[] {
  const doneColumnIds = new Set(columns.filter((c) => c.is_done).map((c) => c.id));

  const lastDoneAt = new Map<string, number>();
  const addedToSprintAt = new Map<string, number>(); // key: `${cardId}:${sprintId}`, latest add
  for (const event of events) {
    const at = new Date(event.created_at).getTime();
    if (event.event_type === "moved" && event.to_column_id && doneColumnIds.has(event.to_column_id)) {
      lastDoneAt.set(event.card_id, at);
    } else if (event.event_type === "sprint_added" && event.sprint_id) {
      addedToSprintAt.set(`${event.card_id}:${event.sprint_id}`, at);
    }
  }

  const durations = new Map<string, number[]>();
  for (const card of cards) {
    if (!card.sprint_id || card.archived || !doneColumnIds.has(card.column_id)) continue;
    const doneAt = lastDoneAt.get(card.id);
    if (doneAt === undefined) continue; // created straight into Done: no measurable time

    const createdAt = new Date(card.created_at).getTime();
    const addedAt = addedToSprintAt.get(`${card.id}:${card.sprint_id}`);
    // Added to the sprint after it was already done: fall back to creation.
    const startedAt = addedAt !== undefined && addedAt <= doneAt ? Math.max(addedAt, createdAt) : createdAt;

    const list = durations.get(card.sprint_id) ?? [];
    list.push(Math.max(0, doneAt - startedAt) / DAY_MS);
    durations.set(card.sprint_id, list);
  }

  return [...sprints]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((sprint) => {
      const list = durations.get(sprint.id) ?? [];
      const average = list.length ? list.reduce((sum, d) => sum + d, 0) / list.length : null;
      return {
        sprintId: sprint.id,
        sprint: sprint.name,
        averageDays: average === null ? null : Math.round(average * 10) / 10,
        completed: list.length,
      };
    });
}

export function formatDays(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours <= 1 ? "under an hour" : `${hours} hours`;
  }
  return `${days.toFixed(1)} ${days === 1 ? "day" : "days"}`;
}
