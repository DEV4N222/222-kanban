"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteArchivedBoard, restoreBoard } from "@/lib/actions/boards";
import { Archive, RotateCcw, Trash2 } from "lucide-react";

export type ArchivedBoard = { id: string; name: string; archivedAt: string; archivedBy: string | null };

/** Owners and admins: list archived boards with Restore and Delete permanently. */
export function ArchivedBoardsDialog({ workspaceId, boards }: { workspaceId: string; boards: ArchivedBoard[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  async function restore(board: ArchivedBoard) {
    setBusyId(board.id);
    const result = await restoreBoard(board.id, workspaceId);
    setBusyId(null);
    if (result.error) {
      toast.error("Couldn't restore board", { description: result.error });
      return;
    }
    toast.success(`"${board.name}" restored`);
  }

  async function remove(board: ArchivedBoard) {
    setBusyId(board.id);
    const result = await deleteArchivedBoard(board.id, workspaceId, confirmName);
    setBusyId(null);
    if (result.error) {
      toast.error("Couldn't delete board", { description: result.error });
      return;
    }
    setDeletingId(null);
    setConfirmName("");
    toast.success(`"${board.name}" permanently deleted`);
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setDeletingId(null);
          setConfirmName("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Archive className="size-4" />
        Archived boards{boards.length > 0 ? ` (${boards.length})` : ""}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archived boards</DialogTitle>
          <DialogDescription>
            Restore a board to bring it back exactly as it was. Deleting is permanent: the board and all its
            cards, sprints, RAID log and retros are removed for good.
          </DialogDescription>
        </DialogHeader>

        {boards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No archived boards.</p>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {boards.map((board) => (
              <li key={board.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{board.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Archived {format(new Date(board.archivedAt), "d MMM yyyy")}
                      {board.archivedBy && ` by ${board.archivedBy}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="sm" disabled={busyId === board.id} onClick={() => restore(board)}>
                      <RotateCcw className="size-3.5" />
                      Restore
                    </Button>
                    {deletingId !== board.id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${board.name} permanently`}
                        disabled={busyId === board.id}
                        onClick={() => {
                          setDeletingId(board.id);
                          setConfirmName("");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {deletingId === board.id && (
                  <form
                    className="mt-3 space-y-2 rounded-md bg-destructive/10 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      remove(board);
                    }}
                  >
                    <p className="text-xs text-destructive">
                      This permanently deletes the board, its cards and images, sprints, RAID log and retros. To
                      confirm, type <span className="font-semibold">{board.name}</span>:
                    </p>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      aria-label="Type the board name to confirm"
                      autoFocus
                      className="bg-background"
                    />
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                        Keep
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={busyId === board.id || confirmName.trim() !== board.name.trim()}
                      >
                        Delete permanently
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
