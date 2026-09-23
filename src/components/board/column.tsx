"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { CardTile } from "./card-tile";
import { AddCardInline } from "./add-card-inline";
import { ColumnMenu } from "./column-menu";
import type { CardWithLabels, ColumnRow, LabelRow, MemberWithProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Column({
  column,
  cards,
  labels,
  members,
  onAddCard,
  onOpenCard,
  onRename,
  onDelete,
  onUpdateSettings,
}: {
  column: ColumnRow;
  cards: CardWithLabels[];
  labels: LabelRow[];
  members: MemberWithProfile[];
  onAddCard: (title: string) => void;
  onOpenCard: (cardId: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdateSettings: (fields: { is_done?: boolean; wip_limit?: number | null }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overLimit = !!column.wip_limit && cards.length > column.wip_limit;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{column.name}</span>
          <Badge
            variant={overLimit ? "destructive" : "secondary"}
            className="h-5 px-1.5 text-xs"
          >
            {cards.length}
            {column.wip_limit ? `/${column.wip_limit}` : ""}
          </Badge>
        </div>
        <ColumnMenu
          column={column}
          onRename={onRename}
          onDelete={onDelete}
          onUpdateSettings={onUpdateSettings}
        />
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-2 px-2 pb-2 transition-colors",
          isOver && "bg-accent/50"
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              labels={labels}
              members={members}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>
        <AddCardInline onAdd={onAddCard} />
      </div>
    </div>
  );
}
