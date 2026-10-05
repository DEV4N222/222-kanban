import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { NewBoardDialog } from "@/components/workspace/new-board-dialog";
import { BoardTileMenu } from "@/components/workspace/board-tile-menu";
import { ArchivedBoardsDialog, type ArchivedBoard } from "@/components/workspace/archived-boards-dialog";

type BoardListRow = { id: string; name: string; created_at: string; archived_at: string | null; archived_by: string | null };

export default async function WorkspaceBoardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    boardsResult,
    { data: members },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("boards")
      .select("id, name, created_at, archived_at, archived_by")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase.from("workspace_members").select("user_id, role, profiles(name)").eq("workspace_id", workspaceId),
  ]);

  // Until 0008_archive_boards.sql has run there is no archived_at column;
  // fall back to listing every board rather than showing none.
  let boards: BoardListRow[] = boardsResult.data ?? [];
  if (boardsResult.error) {
    const { data } = await supabase
      .from("boards")
      .select("id, name, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    boards = (data ?? []).map((b) => ({ ...b, archived_at: null, archived_by: null }));
  }

  const myRole = members?.find((m) => m.user_id === user?.id)?.role;
  const canArchive = myRole === "owner" || myRole === "admin";
  const nameOf = (id: string | null) => (id && members?.find((m) => m.user_id === id)?.profiles?.name) || null;

  const active = boards.filter((b) => !b.archived_at);
  const archived: ArchivedBoard[] = boards
    .filter((b) => b.archived_at)
    .map((b) => ({ id: b.id, name: b.name, archivedAt: b.archived_at!, archivedBy: nameOf(b.archived_by) }))
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Boards</h1>
        <div className="flex items-center gap-2">
          {canArchive && <ArchivedBoardsDialog workspaceId={workspaceId} boards={archived} />}
          <NewBoardDialog workspaceId={workspaceId} />
        </div>
      </div>

      {active.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((board) => (
            <div key={board.id} className="relative">
              <Link href={`/w/${workspaceId}/b/${board.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className={canArchive ? "pr-12" : undefined}>
                    <CardTitle className="text-base">{board.name}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
              {canArchive && (
                <div className="absolute top-3 right-3">
                  <BoardTileMenu boardId={board.id} boardName={board.name} workspaceId={workspaceId} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {archived.length > 0
            ? "No active boards. Create a new one, or restore one from Archived boards."
            : "No boards yet. Create your first board to get started."}
        </p>
      )}
    </div>
  );
}
