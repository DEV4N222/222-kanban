"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveBoard } from "@/lib/actions/boards";
import { Archive, MoreHorizontal } from "lucide-react";

/** Owners and admins: ⋯ on a board tile with "Archive board". */
export function BoardTileMenu({ boardId, boardName, workspaceId }: { boardId: string; boardName: string; workspaceId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function archive() {
    setPending(true);
    const result = await archiveBoard(boardId, workspaceId);
    setPending(false);
    if (result.error) {
      toast.error("Couldn't archive board", { description: result.error });
      return;
    }
    setConfirming(false);
    toast.success(`"${boardName}" archived`, { description: "Find it under Archived boards to restore or delete it." });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Options for ${boardName}`} />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {/* onClick, not onSelect: the menu's closing would clobber the dialog's open state. */}
          <DropdownMenuItem onClick={() => setConfirming(true)}>
            <Archive className="size-4" />
            Archive board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive &ldquo;{boardName}&rdquo;?</DialogTitle>
            <DialogDescription>
              The board leaves the Boards list for everyone, but nothing is deleted. An owner or admin
              can restore it, or delete it permanently, from Archived boards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={archive} disabled={pending}>
              {pending ? "Archiving…" : "Archive board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
