import { createClient } from "@/lib/supabase/server";
import { computeBurndown, type BurndownPoint } from "@/lib/analytics/burndown";
import { computeCfd } from "@/lib/analytics/cfd";
import { computeLeaderboard, type LeaderboardEntry } from "@/lib/analytics/leaderboard";
import { computeCadence, type CadencePoint } from "@/lib/analytics/cadence";
import type { CardEventRow, ColumnRow, MemberWithProfile, SprintRow } from "@/lib/types";

export type ReportCard = { title: string; owner: string; labels: string[]; column: string; completedAt: string | null };

export type SprintReportData = {
  boardName: string;
  sprint: Pick<SprintRow, "name" | "start_date" | "end_date" | "goal" | "status">;
  generatedAt: string;
  totals: {
    inSprint: number;
    completed: number;
    carriedOver: number;
    completionRate: number | null;
    contributors: number;
    averageDays: number | null;
    previousAverageDays: number | null;
    previousSprintName: string | null;
  };
  completedCards: ReportCard[];
  carriedOverCards: ReportCard[];
  burndown: BurndownPoint[];
  cfd: { dates: string[]; series: { name: string; values: number[] }[] };
  leaderboard: LeaderboardEntry[];
  cadence: CadencePoint[];
  retro: { story: string; themes: string[] } | null;
};

/** Everything the sprint report needs, read with the signed-in user's permissions. */
export async function loadSprintReportData(
  workspaceId: string,
  boardId: string,
  sprintId: string
): Promise<SprintReportData | null> {
  const supabase = await createClient();

  const [
    { data: board },
    { data: columns },
    { data: sprints },
    { data: events },
    { data: cards },
    { data: members },
    { data: labels },
    { data: retro },
  ] = await Promise.all([
    supabase.from("boards").select("id, name").eq("id", boardId).maybeSingle(),
    supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
    supabase.from("sprints").select("*").eq("board_id", boardId),
    supabase.from("card_events").select("*").eq("board_id", boardId).order("created_at"),
    supabase
      .from("cards")
      .select("id, title, column_id, sprint_id, assignee_id, archived, created_at, card_labels(label_id)")
      .eq("board_id", boardId)
      .not("sprint_id", "is", null),
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles(id, name, avatar_url)")
      .eq("workspace_id", workspaceId),
    supabase.from("labels").select("id, name").eq("board_id", boardId),
    supabase.from("retro_summaries").select("story, themes").eq("sprint_id", sprintId).maybeSingle(),
  ]);

  const sprint = (sprints ?? []).find((s) => s.id === sprintId);
  if (!board || !columns || !sprint) return null;

  const allEvents = (events ?? []) as CardEventRow[];
  const allColumns = columns as ColumnRow[];
  const memberList = (members ?? []) as MemberWithProfile[];
  const doneIds = new Set(allColumns.filter((c) => c.is_done).map((c) => c.id));
  const nameOf = (id: string | null) =>
    (id && memberList.find((m) => m.user_id === id)?.profiles?.name) || "Unassigned";
  const columnName = (id: string) => allColumns.find((c) => c.id === id)?.name ?? "";
  const labelNames = (ids: { label_id: string }[] | null) =>
    (ids ?? []).map((l) => labels?.find((x) => x.id === l.label_id)?.name).filter((n): n is string => !!n);

  const lastDoneAt = new Map<string, string>();
  for (const e of allEvents) {
    if (e.event_type === "moved" && e.to_column_id && doneIds.has(e.to_column_id)) lastDoneAt.set(e.card_id, e.created_at);
  }

  const sprintCards = (cards ?? []).filter((c) => c.sprint_id === sprintId && !c.archived);
  const toReportCard = (c: (typeof sprintCards)[number]): ReportCard => ({
    title: c.title,
    owner: nameOf(c.assignee_id),
    labels: labelNames(c.card_labels as unknown as { label_id: string }[] | null),
    column: columnName(c.column_id),
    completedAt: lastDoneAt.get(c.id) ?? null,
  });
  const completedCards = sprintCards
    .filter((c) => doneIds.has(c.column_id))
    .map(toReportCard)
    .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
  const carriedOverCards = sprintCards.filter((c) => !doneIds.has(c.column_id)).map(toReportCard);

  const leaderboard = computeLeaderboard(cards ?? [], allEvents, allColumns, memberList, sprintId);
  const cadence = computeCadence(cards ?? [], allEvents, allColumns, sprints ?? []);
  const index = cadence.findIndex((p) => p.sprintId === sprintId);
  const previous = cadence.slice(0, Math.max(0, index)).reverse().find((p) => p.averageDays !== null);

  // CFD over the sprint, up to today if it's still running.
  const start = new Date(sprint.start_date);
  const end = new Date(Math.min(new Date(sprint.end_date).getTime(), Date.now()));
  const { points: cfdPoints } = computeCfd(allEvents, allColumns, { start, end: end < start ? start : end });
  const ordered = [...allColumns].sort((a, b) => a.position - b.position);

  return {
    boardName: board.name,
    sprint: {
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      goal: sprint.goal,
      status: sprint.status,
    },
    generatedAt: new Date().toISOString(),
    totals: {
      inSprint: sprintCards.length,
      completed: completedCards.length,
      carriedOver: carriedOverCards.length,
      completionRate: sprintCards.length ? Math.round((completedCards.length / sprintCards.length) * 100) : null,
      contributors: leaderboard.filter((e) => e.userId).length,
      averageDays: cadence[index]?.averageDays ?? null,
      previousAverageDays: previous?.averageDays ?? null,
      previousSprintName: previous?.sprint ?? null,
    },
    completedCards,
    carriedOverCards,
    burndown: computeBurndown(allEvents, allColumns, sprint),
    cfd: {
      dates: cfdPoints.map((p) => String(p.date)),
      series: ordered.map((col) => ({ name: col.name, values: cfdPoints.map((p) => Number(p[col.id] ?? 0)) })),
    },
    leaderboard,
    cadence,
    retro: retro ? { story: retro.story, themes: retro.themes } : null,
  };
}
