"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LabelChip } from "@/components/labels/label-chip";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { CardWithLabels, LabelRow, MemberWithProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CardTile({
  card,
  labels,
  members,
  onOpen,
}: {
  card: CardWithLabels;
  labels: LabelRow[];
  members: MemberWithProfile[];
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardLabels = labels.filter((l) => card.label_ids.includes(l.id));
  const assignee = members.find((m) => m.user_id === card.assignee_id)?.profiles;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "cursor-pointer rounded-md border bg-card p-3 text-sm shadow-sm hover:border-foreground/20",
        isDragging && "opacity-40"
      )}
    >
      {cardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <LabelChip key={l.id} label={l} className="px-1.5 text-[11px]" />
          ))}
        </div>
      )}

      <p className="font-medium leading-snug">{card.title}</p>

      {(card.due_date || assignee) && (
        <div className="mt-2 flex items-center justify-between">
          {card.due_date ? (
            <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
              <CalendarIcon className="size-3" />
              {format(new Date(card.due_date), "MMM d")}
            </Badge>
          ) : (
            <span />
          )}
          {assignee && (
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}
