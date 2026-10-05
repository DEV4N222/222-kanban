"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteArchivedCard, listArchivedCards, unarchiveCard, type ArchivedCard } from "@/lib/actions/cards";
import type { CardWithLabels } from "@/lib/types";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";

export function ArchivedCardsDialog({
  boardId,
  canDelete,
  onRestored,
}: {
  boardId: string;
  /** Owners and admins; the database enforces this too. */
  canDelete: boolean;
  onRestored: (card: CardWithLabels) => void;
}) {
  const [cards, setCards] = useState<ArchivedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    setCards(null);
    setError(null);
    const result = await listArchivedCards(boardId);
    if ("error" in result) setError(result.error);
    else setCards(result.cards);
  }

  async function restore(card: ArchivedCard) {
    setBusyId(card.id);
    const result = await unarchiveCard(card.id, boardId);
    setBusyId(null);
    if ("error" in result) {
      toast.error("Couldn't restore card", { description: result.error });
      return;
    }
    setCards((prev) => prev?.filter((c) => c.id !== card.id) ?? null);
    onRestored(result.card);
    toast.success(`"${card.title}" restored to ${card.columnName ?? "the board"}`);
  }

  async function remove(card: ArchivedCard) {
    setConfirmingId(null);
    setBusyId(card.id);
    const result = await deleteArchivedCard(card.id);
    setBusyId(null);
    if ("error" in result && result.error) {
      toast.error("Couldn't delete card", { description: result.error });
      return;
    }
    setCards((prev) => prev?.filter((c) => c.id !== card.id) ?? null);
    toast.success(`"${card.title}" permanently deleted`);
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) load();
        else setConfirmingId(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Archive className="size-4" />
        Archived
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archived cards</DialogTitle>
          <DialogDescription>
            Restore a card to put it back where it was.
            {canDelete
              ? " Deleting is permanent and can't be undone."
              : " Only workspace owners and admins can delete cards permanently."}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!cards && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        )}

        {cards && cards.length === 0 && (
          <p className="text-sm text-muted-foreground">No archived cards on this board.</p>
        )}

        {cards && cards.length > 0 && (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {cards.map((card) => (
              <li key={card.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{card.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {card.columnName ?? "Unknown column"}
                      {card.archivedAt && ` · archived ${format(new Date(card.archivedAt), "d MMM yyyy")}`}
                      {card.archivedBy && ` by ${card.archivedBy}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === card.id}
                      onClick={() => restore(card)}
                    >
                      <RotateCcw className="size-3.5" />
                      Restore
                    </Button>
                    {canDelete && confirmingId !== card.id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${card.title} permanently`}
                        disabled={busyId === card.id}
                        onClick={() => setConfirmingId(card.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {confirmingId === card.id && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2">
                    <p className="text-xs text-destructive">
                      Delete permanently? The card, its images and its history will be gone for good.
                    </p>
                    <div className="flex gap-1">
                      <Button variant="destructive" size="sm" onClick={() => remove(card)}>
                        Delete permanently
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                        Keep
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
