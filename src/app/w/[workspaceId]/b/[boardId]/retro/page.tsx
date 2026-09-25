import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RetroBoard } from "@/components/retro/retro-board";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function RetroPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
  searchParams: Promise<{ sprint?: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const { sprint: sprintParam } = await searchParams;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: board },
    { data: sprints },
    { data: members },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("boards").select("id, name").eq("id", boardId).maybeSingle(),
    supabase.from("sprints").select("*").eq("board_id", boardId).order("start_date", { ascending: false }),
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles(id, name, avatar_url)")
      .eq("workspace_id", workspaceId),
  ]);

  if (!board) {
    notFound();
  }

  const selectedSprint =
    (sprints ?? []).find((s) => s.id === sprintParam) ??
    (sprints ?? []).find((s) => s.status === "active") ??
    (sprints ?? [])[0] ??
    null;

  const [{ data: notes }, { data: summary }] = selectedSprint
    ? await Promise.all([
        supabase.from("retro_notes").select("*").eq("sprint_id", selectedSprint.id).order("created_at"),
        supabase.from("retro_summaries").select("*").eq("sprint_id", selectedSprint.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href={`/w/${workspaceId}/b/${boardId}`} />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Retrospectives</h1>
            <p className="text-sm text-muted-foreground">{board.name}</p>
          </div>
        </div>
        {sprints && sprints.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label="Choose a sprint">
            {sprints.map((sprint) => (
              <Button
                key={sprint.id}
                size="sm"
                variant={sprint.id === selectedSprint?.id ? "secondary" : "ghost"}
                nativeButton={false}
                render={<Link href={`/w/${workspaceId}/b/${boardId}/retro?sprint=${sprint.id}`} />}
                className={cn(sprint.status === "active" && "font-semibold")}
              >
                {sprint.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedSprint ? (
        <RetroBoard
          key={selectedSprint.id}
          boardId={boardId}
          sprintId={selectedSprint.id}
          sprintName={selectedSprint.name}
          initialNotes={notes ?? []}
          initialSummary={summary ?? null}
          members={members ?? []}
          currentUserId={user?.id ?? ""}
          aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        />
      ) : (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Retros are run per sprint. Create a sprint from the board&apos;s <strong>Sprints</strong> button,
          then come back here to hold its retrospective.
        </p>
      )}
    </div>
  );
}
