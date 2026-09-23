import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { NewBoardDialog } from "@/components/workspace/new-board-dialog";

export default async function WorkspaceBoardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: boards } = await supabase
    .from("boards")
    .select("id, name, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Boards</h1>
        <NewBoardDialog workspaceId={workspaceId} />
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/w/${workspaceId}/b/${board.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{board.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No boards yet. Create your first board to get started.
        </p>
      )}
    </div>
  );
}
