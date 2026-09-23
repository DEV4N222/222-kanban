import { format } from "date-fns";
import type { CardEventRow, ColumnRow } from "@/lib/types";

export type CfdPoint = { date: string } & Record<string, number | string>;

// A Cumulative Flow Diagram tracks, per workflow stage, the count of cards
// that have ever reached that stage or a later one — a monotonically
// non-decreasing "arrival count", not just current column membership. Band
// width between adjacent stage lines is what shows WIP/cycle time.
export function computeCfd(
  events: CardEventRow[],
  columns: ColumnRow[],
  range: { start: Date; end: Date }
): { points: CfdPoint[]; columns: ColumnRow[] } {
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  const colIndex = new Map(sortedColumns.map((c, i) => [c.id, i]));

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  type CardState = { archived: boolean; arrivalTimes: number[] };
  const cardStates = new Map<string, CardState>();
  function ensureCard(cardId: string): CardState {
    let s = cardStates.get(cardId);
    if (!s) {
      s = { archived: false, arrivalTimes: new Array(sortedColumns.length).fill(Infinity) };
      cardStates.set(cardId, s);
    }
    return s;
  }

  const days: Date[] = [];
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);
  const endBoundary = new Date(range.end);
  endBoundary.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endBoundary.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  let eventPointer = 0;
  const points: CfdPoint[] = [];

  for (const day of days) {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayMs = endOfDay.getTime();

    while (
      eventPointer < sortedEvents.length &&
      new Date(sortedEvents[eventPointer].created_at).getTime() <= endOfDayMs
    ) {
      const event = sortedEvents[eventPointer];
      const state = ensureCard(event.card_id);

      if (event.event_type === "archived") {
        state.archived = true;
      } else if (event.event_type === "unarchived") {
        state.archived = false;
      } else if (event.to_column_id) {
        const idx = colIndex.get(event.to_column_id);
        if (idx !== undefined) {
          const ts = new Date(event.created_at).getTime();
          for (let i = 0; i <= idx; i++) {
            if (state.arrivalTimes[i] > ts) state.arrivalTimes[i] = ts;
          }
        }
      }
      eventPointer++;
    }

    const counts = new Array(sortedColumns.length).fill(0);
    for (const state of cardStates.values()) {
      if (state.archived) continue;
      for (let i = 0; i < sortedColumns.length; i++) {
        if (state.arrivalTimes[i] <= endOfDayMs) counts[i]++;
      }
    }

    const point: CfdPoint = { date: format(day, "MMM d") };
    sortedColumns.forEach((col, i) => {
      point[col.id] = counts[i];
    });
    points.push(point);
  }

  return { points, columns: sortedColumns };
}
