import type { CardEventRow, CardRow, ColumnRow, SprintRow } from "@/lib/types";

export type CadencePoint = {
  sprintId: string;
  sprint: string;
  /** Average days from leaving the backlog to reaching Done; null when nothing is done yet. */
  averageDays: number | null;
  completed: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The column named "Backlog" (any capitalisation), if the board has one. */
export function backlogColumn(columns: ColumnRow[]): ColumnRow | undefined {
  return columns.find((c) => c.name.trim().toLowerCase() === "backlog");
}

// Squad cadence: for each sprint, the average time its completed cards took
// once work started. A card's clock starts the last time it was pulled out of
// the backlog (so time waiting there doesn't count) and stops the last time
// it entered an `is_done` column. A card that never sat in the backlog (or a
// board with no column named "Backlog") starts when the card was created. Completed means the same as the burndown and
// gamification charts: in the sprint, not archived, and currently in Done.
export function computeCadence(
  cards: Pick<CardRow, "id" | "column_id" | "sprint_id" | "archived" | "created_at">[],
  events: CardEventRow[],
  columns: ColumnRow[],
  sprints: SprintRow[]
): CadencePoint[] {
  const doneColumnIds = new Set(columns.filter((c) => c.is_done).map((c) => c.id));
  const backlogId = backlogColumn(columns)?.id;

  const moves = new Map<string, CardEventRow[]>();
  for (const event of events) {
    if (event.event_type !== "moved" && event.event_type !== "created") continue;
    const list = moves.get(event.card_id) ?? [];
    list.push(event);
    moves.set(event.card_id, list);
  }

  const durations = new Map<string, number[]>();
  for (const card of cards) {
    if (!card.sprint_id || card.archived || !doneColumnIds.has(card.column_id)) continue;

    const history = (moves.get(card.id) ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const at = (e: CardEventRow) => new Date(e.created_at).getTime();

    const lastDone = [...history]
      .reverse()
      .find((e) => e.event_type === "moved" && e.to_column_id && doneColumnIds.has(e.to_column_id));
    if (!lastDone) continue; // created straight into Done: no measurable time
    const doneAt = at(lastDone);

    const pulled = [...history]
      .reverse()
      .find(
        (e) =>
          backlogId !== undefined &&
          e.event_type === "moved" &&
          e.from_column_id === backlogId &&
          e.to_column_id !== backlogId &&
          at(e) <= doneAt
      );
    const startedAt = pulled ? at(pulled) : new Date(card.created_at).getTime();

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
