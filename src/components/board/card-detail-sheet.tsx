"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateCard, archiveCard, setCardLabels, assignCardToSprint } from "@/lib/actions/cards";
import type { CardWithLabels, LabelRow, MemberWithProfile, SprintRow, CardEventRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_ASSIGNEE = "__none__";
const NO_SPRINT = "__none__";

export function CardDetailSheet({
  card,
  open,
  onOpenChange,
  boardId,
  labels,
  sprints,
  members,
  onLocalUpdate,
  onArchived,
}: {
  card: CardWithLabels | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  labels: LabelRow[];
  sprints: SprintRow[];
  members: MemberWithProfile[];
  onLocalUpdate: (cardId: string, fields: Partial<CardWithLabels>) => void;
  onArchived: (cardId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {card && (
          <CardDetailContent
            key={card.id}
            card={card}
            boardId={boardId}
            labels={labels}
            sprints={sprints}
            members={members}
            onLocalUpdate={onLocalUpdate}
            onArchived={onArchived}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CardDetailContent({
  card,
  boardId,
  labels,
  sprints,
  members,
  onLocalUpdate,
  onArchived,
}: {
  card: CardWithLabels;
  boardId: string;
  labels: LabelRow[];
  sprints: SprintRow[];
  members: MemberWithProfile[];
  onLocalUpdate: (cardId: string, fields: Partial<CardWithLabels>) => void;
  onArchived: (cardId: string) => void;
}) {
  // Keyed by card.id from the parent, so this remounts (and re-derives the
  // initial state below) whenever the open card changes.
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [events, setEvents] = useState<CardEventRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("card_events")
      .select("*")
      .eq("card_id", card.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setEvents(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  function saveTitle() {
    const trimmed = title.trim() || card.title;
    setTitle(trimmed);
    onLocalUpdate(card.id, { title: trimmed });
    updateCard(card.id, { title: trimmed });
  }

  function saveDescription() {
    onLocalUpdate(card.id, { description });
    updateCard(card.id, { description: description || null });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle
          render={
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              rows={1}
              className="resize-none border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
          }
        />
      </SheetHeader>

      <div className="space-y-6 px-4">
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            placeholder="Add a description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={card.assignee_id ?? NO_ASSIGNEE}
              onValueChange={(value) => {
                const assignee_id = value === NO_ASSIGNEE ? null : value;
                onLocalUpdate(card.id, { assignee_id });
                updateCard(card.id, { assignee_id });
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value: string) =>
                    value === NO_ASSIGNEE
                      ? "Unassigned"
                      : (members.find((m) => m.user_id === value)?.profiles?.name ?? "Unknown")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profiles?.name ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due date</Label>
            <Popover>
              <PopoverTrigger
                render={<Button variant="outline" className="w-full justify-start font-normal" />}
              >
                <CalendarIcon className="size-4" />
                {card.due_date ? format(new Date(card.due_date), "MMM d, yyyy") : "No due date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={card.due_date ? new Date(card.due_date) : undefined}
                  onSelect={(date) => {
                    const due_date = date ? format(date, "yyyy-MM-dd") : null;
                    onLocalUpdate(card.id, { due_date });
                    updateCard(card.id, { due_date });
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sprint</Label>
          <Select
            value={card.sprint_id ?? NO_SPRINT}
            onValueChange={(value) => {
              const sprint_id = value === NO_SPRINT ? null : value;
              onLocalUpdate(card.id, { sprint_id });
              assignCardToSprint(card.id, boardId, sprint_id);
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {(value: string) =>
                  value === NO_SPRINT
                    ? "No sprint"
                    : (sprints.find((s) => s.id === value)?.name ?? "Unknown")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SPRINT}>No sprint</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {labels.length > 0 && (
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const active = card.label_ids.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => {
                      const nextIds = active
                        ? card.label_ids.filter((id) => id !== label.id)
                        : [...card.label_ids, label.id];
                      onLocalUpdate(card.id, { label_ids: nextIds });
                      setCardLabels(card.id, nextIds);
                    }}
                  >
                    <Badge
                      style={{ backgroundColor: active ? label.color : undefined }}
                      variant={active ? "default" : "outline"}
                      className={cn(!active && "text-muted-foreground")}
                    >
                      {label.name}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Activity</Label>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {events.map((event) => (
              <li key={event.id}>
                {describeEvent(event)} — {format(new Date(event.created_at), "MMM d, HH:mm")}
              </li>
            ))}
            {events.length === 0 && <li>No activity yet.</li>}
          </ul>
        </div>
      </div>

      <SheetFooter>
        <Button
          variant="outline"
          onClick={() => {
            archiveCard(card.id, boardId);
            onArchived(card.id);
          }}
        >
          Archive card
        </Button>
      </SheetFooter>
    </>
  );
}

function describeEvent(event: CardEventRow): string {
  switch (event.event_type) {
    case "created":
      return "Card created";
    case "moved":
      return "Moved to a different column";
    case "archived":
      return "Archived";
    case "unarchived":
      return "Unarchived";
    case "sprint_added":
      return "Added to sprint";
    case "sprint_removed":
      return "Removed from sprint";
    default:
      return event.event_type;
  }
}
