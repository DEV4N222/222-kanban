import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";
import type { CardWithLabels } from "@/lib/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: board },
    { data: columns },
    { data: cardsRaw },
    { data: labels },
    { data: sprints },
    { data: members },
  ] = await Promise.all([
    // "*" rather than naming archived_at, so this works before the archive migration has run.
    supabase.from("boards").select("*").eq("id", boardId).maybeSingle(),
    supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
    supabase
      .from("cards")
      .select("*, card_labels(label_id)")
      .eq("board_id", boardId)
      .eq("archived", false)
      .order("position"),
    supabase.from("labels").select("*").eq("board_id", boardId),
    supabase.from("sprints").select("*").eq("board_id", boardId).order("start_date", { ascending: false }),
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles(id, name, avatar_url)")
      .eq("workspace_id", workspaceId),
  ]);

  if (!board) {
    notFound();
  }

  if (board.archived_at) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 p-6">
        <div className="space-y-3 rounded-lg border p-6">
          <h1 className="text-lg font-semibold">&ldquo;{board.name}&rdquo; is archived</h1>
          <p className="text-sm text-muted-foreground">
            Nothing has been deleted. A workspace owner or admin can restore it from Boards → Archived boards.
          </p>
          <Button nativeButton={false} render={<Link href={`/w/${workspaceId}`} />}>
            Back to boards
          </Button>
        </div>
      </div>
    );
  }

  const cards: CardWithLabels[] = (cardsRaw ?? []).map((c) => {
    const { card_labels, ...rest } = c as typeof c & {
      card_labels: { label_id: string }[] | null;
    };
    return { ...rest, label_ids: (card_labels ?? []).map((l) => l.label_id) };
  });

  return (
    <BoardView
      workspaceId={workspaceId}
      boardId={boardId}
      boardName={board.name}
      initialColumns={columns ?? []}
      initialCards={cards}
      labels={labels ?? []}
      initialSprints={sprints ?? []}
      members={members ?? []}
      currentUserId={user?.id ?? ""}
    />
  );
}
