import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeCfd } from "@/lib/analytics/cfd";
import { computeBurndown } from "@/lib/analytics/burndown";
import { CfdChart } from "@/components/charts/cfd-chart";
import { computeLeaderboard } from "@/lib/analytics/leaderboard";
import { BurndownChart } from "@/components/charts/burndown-chart";
import { GamificationChart } from "@/components/charts/gamification-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
  searchParams: Promise<{ range?: string; sprint?: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const { range: rangeParam, sprint: sprintParam } = await searchParams;
  const rangeDays = RANGE_OPTIONS.some((o) => o.value === Number(rangeParam))
    ? Number(rangeParam)
    : 30;

  const supabase = await createClient();

  const [
    { data: board },
    { data: columns },
    { data: sprints },
    { data: events },
    { data: cards },
    { data: members },
  ] = await Promise.all([
      supabase.from("boards").select("id, name").eq("id", boardId).maybeSingle(),
      supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
      supabase
        .from("sprints")
        .select("*")
        .eq("board_id", boardId)
        .order("start_date", { ascending: false }),
      supabase
        .from("card_events")
        .select("*")
        .eq("board_id", boardId)
        .order("created_at", { ascending: true }),
      supabase
        .from("cards")
        .select("id, column_id, sprint_id, assignee_id, archived")
        .eq("board_id", boardId)
        .not("sprint_id", "is", null),
      supabase
        .from("workspace_members")
        .select("user_id, role, profiles(id, name, avatar_url)")
        .eq("workspace_id", workspaceId),
    ]);

  if (!board || !columns) {
    notFound();
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (rangeDays - 1));
  const { points: cfdPoints } = computeCfd(events ?? [], columns, { start, end });

  const selectedSprint =
    (sprints ?? []).find((s) => s.id === sprintParam) ??
    (sprints ?? []).find((s) => s.status === "active") ??
    (sprints ?? [])[0] ??
    null;

  const burndownPoints = selectedSprint
    ? computeBurndown(events ?? [], columns, selectedSprint)
    : [];

  const leaderboard = selectedSprint
    ? computeLeaderboard(cards ?? [], events ?? [], columns, members ?? [], selectedSprint.id)
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/w/${workspaceId}/b/${boardId}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{board.name} — Analytics</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cumulative Flow Diagram</CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={opt.value === rangeDays ? "secondary" : "ghost"}
                nativeButton={false}
                render={
                  <Link
                    href={`/w/${workspaceId}/b/${boardId}/analytics?range=${opt.value}${sprintParam ? `&sprint=${sprintParam}` : ""}`}
                  />
                }
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {cfdPoints.length > 0 ? (
            <CfdChart points={cfdPoints} columns={columns} />
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet in this range.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Burndown</CardTitle>
          {sprints && sprints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sprints.map((sprint) => (
                <Button
                  key={sprint.id}
                  size="sm"
                  variant={sprint.id === selectedSprint?.id ? "secondary" : "ghost"}
                  nativeButton={false}
                  render={
                    <Link
                      href={`/w/${workspaceId}/b/${boardId}/analytics?sprint=${sprint.id}${rangeParam ? `&range=${rangeParam}` : ""}`}
                    />
                  }
                  className={cn(sprint.status === "active" && "font-semibold")}
                >
                  {sprint.name}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {selectedSprint ? (
            <BurndownChart points={burndownPoints} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a sprint on the board to see a burndown chart.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gamification</CardTitle>
          {selectedSprint && (
            <CardDescription>Cards completed per member in {selectedSprint.name}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!selectedSprint ? (
            <p className="text-sm text-muted-foreground">
              Create a sprint on the board to see who completes the most cards.
            </p>
          ) : leaderboard.length > 0 ? (
            <GamificationChart entries={leaderboard} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No cards completed in {selectedSprint.name} yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
