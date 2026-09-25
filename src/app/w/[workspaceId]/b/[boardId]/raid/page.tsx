import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RaidLog } from "@/components/raid/raid-log";
import { ArrowLeft } from "lucide-react";

export default async function RaidPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const supabase = await createClient();

  const [{ data: board }, { data: items }, { data: members }] = await Promise.all([
    supabase.from("boards").select("id, name").eq("id", boardId).maybeSingle(),
    supabase.from("raid_items").select("*").eq("board_id", boardId).order("number"),
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles(id, name, avatar_url)")
      .eq("workspace_id", workspaceId),
  ]);

  if (!board) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/w/${workspaceId}/b/${boardId}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{board.name} — RAID log</h1>
      </div>

      <RaidLog
        workspaceId={workspaceId}
        boardId={boardId}
        items={items ?? []}
        members={members ?? []}
      />
    </div>
  );
}
