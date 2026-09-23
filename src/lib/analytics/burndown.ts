import { format } from "date-fns";
import type { CardEventRow, ColumnRow, SprintRow } from "@/lib/types";

export type BurndownPoint = { date: string; remaining: number; ideal: number };

// Remaining = cards assigned to this sprint, not archived, and not sitting
// in an `is_done` column, replayed from card_events as of end-of-day.
export function computeBurndown(
  events: CardEventRow[],
  columns: ColumnRow[],
  sprint: SprintRow
): BurndownPoint[] {
  const doneColumnIds = new Set(columns.filter((c) => c.is_done).map((c) => c.id));
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  type CardState = { columnId: string | null; archived: boolean; inSprint: boolean };
  const cardStates = new Map<string, CardState>();
  function ensureCard(id: string): CardState {
    let s = cardStates.get(id);
    if (!s) {
      s = { columnId: null, archived: false, inSprint: false };
      cardStates.set(id, s);
    }
    return s;
  }

  const start = new Date(sprint.start_date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.end_date);
  end.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  let eventPointer = 0;
  const points: BurndownPoint[] = [];
  let initialRemaining: number | null = null;
  const totalDays = days.length - 1;

  days.forEach((day, dayIndex) => {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayMs = endOfDay.getTime();

    while (
      eventPointer < sortedEvents.length &&
      new Date(sortedEvents[eventPointer].created_at).getTime() <= endOfDayMs
    ) {
      const event = sortedEvents[eventPointer];
      const state = ensureCard(event.card_id);

      switch (event.event_type) {
        case "archived":
          state.archived = true;
          break;
        case "unarchived":
          state.archived = false;
          break;
        case "sprint_added":
          if (event.sprint_id === sprint.id) state.inSprint = true;
          break;
        case "sprint_removed":
          state.inSprint = false;
          break;
        case "created":
        case "moved":
          if (event.to_column_id) state.columnId = event.to_column_id;
          break;
      }
      eventPointer++;
    }

    let remaining = 0;
    for (const state of cardStates.values()) {
      if (!state.inSprint || state.archived) continue;
      if (!state.columnId || !doneColumnIds.has(state.columnId)) remaining++;
    }

    if (initialRemaining === null) initialRemaining = remaining;

    const ideal =
      totalDays === 0
        ? 0
        : Math.max(0, initialRemaining - (initialRemaining / totalDays) * dayIndex);

    points.push({
      date: format(day, "MMM d"),
      remaining,
      ideal: Math.round(ideal * 10) / 10,
    });
  });

  return points;
}
