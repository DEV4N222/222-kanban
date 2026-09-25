"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Column } from "./column";
import { NewColumnForm } from "./new-column-form";
import { CardTile } from "./card-tile";
import { CardDetailSheet } from "./card-detail-sheet";
import { SprintDialog } from "./sprint-dialog";
import { LabelsDialog } from "@/components/labels/labels-dialog";
import { useBoardRealtime } from "@/hooks/use-board-realtime";
import { createColumn, deleteColumn, renameColumn, updateColumnSettings } from "@/lib/actions/columns";
import { createCard, moveCard } from "@/lib/actions/cards";
import type { CardWithLabels, ColumnRow, LabelRow, MemberWithProfile, SprintRow } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CalendarClock, CircleCheck, MessagesSquare, ShieldAlert } from "lucide-react";

export function BoardView({
  workspaceId,
  boardId,
  boardName,
  initialColumns,
  initialCards,
  labels: initialLabels,
  initialSprints,
  members,
  currentUserId,
}: {
  workspaceId: string;
  boardId: string;
  boardName: string;
  initialColumns: ColumnRow[];
  initialCards: CardWithLabels[];
  labels: LabelRow[];
  initialSprints: SprintRow[];
  members: MemberWithProfile[];
  currentUserId: string;
}) {
  const [columns, setColumns] = useState<ColumnRow[]>(initialColumns);
  const [cards, setCards] = useState<CardWithLabels[]>(initialCards);
  const [labels, setLabels] = useState<LabelRow[]>(initialLabels);

  const labelUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const card of cards) {
      for (const id of card.label_ids) usage.set(id, (usage.get(id) ?? 0) + 1);
    }
    return usage;
  }, [cards]);

  const sortedLabels = useMemo(
    () => [...labels].sort((a, b) => a.name.localeCompare(b.name)),
    [labels]
  );

  function upsertLabel(label: LabelRow) {
    setLabels((prev) => [...prev.filter((l) => l.id !== label.id), label]);
  }

  function removeLabel(labelId: string) {
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    setCards((prev) =>
      prev.map((c) =>
        c.label_ids.includes(labelId) ? { ...c, label_ids: c.label_ids.filter((id) => id !== labelId) } : c
      )
    );
  }
  const [sprints, setSprints] = useState<SprintRow[]>(initialSprints);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const dragOriginColumn = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // The dragged card's own sortable slot stays registered as a droppable
  // candidate and is rendered following the pointer (via CSS transform), so
  // the pointer is *always* "within" it — plain collision detection (even
  // pointer-based) resolves to the card colliding with itself, and the move
  // silently no-ops. Exclude the active item from the candidate set so
  // collisions resolve to whatever the pointer is actually over.
  const lastOverId = useRef<string | null>(null);
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const otherContainers = args.droppableContainers.filter((c) => c.id !== args.active.id);
    const filteredArgs = { ...args, droppableContainers: otherContainers };

    const pointerIntersections = pointerWithin(filteredArgs);
    const intersections =
      pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(filteredArgs);
    const overId = getFirstCollision(intersections, "id");

    if (overId != null) {
      lastOverId.current = overId as string;
      return [{ id: overId }];
    }

    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  }, []);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, CardWithLabels[]>();
    for (const col of sortedColumns) map.set(col.id, []);
    for (const card of [...cards].sort((a, b) => a.position - b.position)) {
      map.get(card.column_id)?.push(card);
    }
    return map;
  }, [cards, sortedColumns]);

  useBoardRealtime({
    boardId,
    onColumnUpsert: (row) =>
      setColumns((prev) => {
        const others = prev.filter((c) => c.id !== row.id);
        return [...others, row];
      }),
    onColumnDelete: (id) => setColumns((prev) => prev.filter((c) => c.id !== id)),
    onCardUpsert: (row) =>
      setCards((prev) => {
        const existing = prev.find((c) => c.id === row.id);
        const merged = existing ? { ...existing, ...row, label_ids: existing.label_ids } : row;
        return [...prev.filter((c) => c.id !== row.id), merged];
      }),
    onCardDelete: (id) => setCards((prev) => prev.filter((c) => c.id !== id)),
  });

  function findContainer(id: string): string | undefined {
    if (columns.some((c) => c.id === id)) return id;
    return cards.find((c) => c.id === id)?.column_id;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveCardId(id);
    dragOriginColumn.current = findContainer(id) ?? null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === activeId);
      if (!activeCard) return prev;
      const overIndex = prev.filter((c) => c.column_id === overContainer).findIndex((c) => c.id === overId);
      const targetCards = prev.filter((c) => c.column_id === overContainer && c.id !== activeId);
      const insertAt = overIndex >= 0 ? overIndex : targetCards.length;

      const reordered = [...targetCards];
      reordered.splice(insertAt, 0, { ...activeCard, column_id: overContainer });

      const rest = prev.filter((c) => c.column_id !== overContainer && c.id !== activeId);
      return [...rest, ...reordered.map((c, i) => ({ ...c, position: i }))];
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overContainer = findContainer(over.id as string);
    const fromColumnId = dragOriginColumn.current;
    if (!overContainer || !fromColumnId) return;

    const siblings = cards
      .filter((c) => c.column_id === overContainer)
      .sort((a, b) => a.position - b.position);
    const newIndex = siblings.findIndex((c) => c.id === activeId);

    await moveCard({
      cardId: activeId,
      boardId,
      fromColumnId,
      toColumnId: overContainer,
      newIndex: newIndex >= 0 ? newIndex : siblings.length,
    });
  }

  async function handleAddCard(columnId: string, title: string) {
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: CardWithLabels = {
      id: tempId,
      board_id: boardId,
      column_id: columnId,
      sprint_id: null,
      title,
      description: null,
      position: (cardsByColumn.get(columnId)?.length ?? 0) + 1,
      assignee_id: null,
      due_date: null,
      archived: false,
      created_at: new Date().toISOString(),
      created_by: currentUserId,
      label_ids: [],
    };
    setCards((prev) => [...prev, optimistic]);

    const result = await createCard(boardId, columnId, title);
    if (result.success && result.id) {
      setCards((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: result.id! } : c))
      );
    } else {
      setCards((prev) => prev.filter((c) => c.id !== tempId));
    }
  }

  async function handleAddColumn(name: string) {
    await createColumn(boardId, name);
  }

  // The sprint shown beside the board name: the active one, otherwise the next planned one.
  const currentSprint =
    sprints.find((s) => s.status === "active") ??
    sprints
      .filter((s) => s.status === "planned")
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ??
    null;

  const activeCard = cards.find((c) => c.id === activeCardId) ?? null;
  const openCard = cards.find((c) => c.id === openCardId) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-semibold">{boardName}</h1>
          {currentSprint && (
            <Badge
              variant={currentSprint.status === "active" ? "default" : "outline"}
              title={`${format(new Date(currentSprint.start_date), "MMM d")} – ${format(new Date(currentSprint.end_date), "MMM d, yyyy")}`}
            >
              {currentSprint.status === "active" ? <CircleCheck /> : <CalendarClock />}
              {currentSprint.name}
              <span className="font-normal opacity-80">
                · {currentSprint.status === "active" ? "Active" : "Planned"}
              </span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SprintDialog boardId={boardId} sprints={sprints} onSprintsChange={setSprints} />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/w/${workspaceId}/b/${boardId}/retro`} />}
          >
            <MessagesSquare className="size-4" />
            Retro
          </Button>
          <LabelsDialog
            boardId={boardId}
            labels={sortedLabels}
            usage={labelUsage}
            onCreated={upsertLabel}
            onUpdated={upsertLabel}
            onDeleted={removeLabel}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/w/${workspaceId}/b/${boardId}/raid`} />}
          >
            <ShieldAlert className="size-4" />
            RAID
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/w/${workspaceId}/b/${boardId}/analytics`} />}
          >
            <BarChart3 className="size-4" />
            Analytics
          </Button>
        </div>
      </div>

      <DndContext
        id={`board-${boardId}`}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {sortedColumns.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardsByColumn.get(column.id) ?? []}
              labels={sortedLabels}
              members={members}
              onAddCard={(title) => handleAddCard(column.id, title)}
              onOpenCard={setOpenCardId}
              onRename={(name) => {
                setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, name } : c)));
                renameColumn(column.id, name);
              }}
              onDelete={() => {
                setColumns((prev) => prev.filter((c) => c.id !== column.id));
                deleteColumn(column.id);
              }}
              onUpdateSettings={(fields) => {
                setColumns((prev) =>
                  prev.map((c) => (c.id === column.id ? { ...c, ...fields } : c))
                );
                updateColumnSettings(column.id, fields);
              }}
            />
          ))}
          <NewColumnForm onAdd={handleAddColumn} />
        </div>

        <DragOverlay>
          {activeCard ? (
            <CardTile card={activeCard} labels={sortedLabels} members={members} onOpen={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardDetailSheet
        card={openCard}
        open={!!openCard}
        onOpenChange={(open) => !open && setOpenCardId(null)}
        boardId={boardId}
        labels={sortedLabels}
        onLabelCreated={upsertLabel}
        sprints={sprints}
        members={members}
        onLocalUpdate={(cardId, fields) =>
          setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...fields } : c)))
        }
        onArchived={(cardId) => {
          setCards((prev) => prev.filter((c) => c.id !== cardId));
          setOpenCardId(null);
        }}
      />
    </div>
  );
}
