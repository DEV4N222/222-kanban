"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RetroStory } from "./retro-story";
import { addRetroNote, deleteRetroNote, updateRetroNote } from "@/lib/actions/retro";
import { RETRO_COLUMNS } from "@/lib/retro";
import { useRetroRealtime } from "@/hooks/use-retro-realtime";
import type { MemberWithProfile, RetroKind, RetroNoteRow, RetroSummaryRow } from "@/lib/types";
import { Ban, Pencil, PartyPopper, Plus, Rocket, ThumbsUp, Trash2 } from "lucide-react";

const ICONS: Record<RetroKind, typeof ThumbsUp> = {
  keep: ThumbsUp,
  stop: Ban,
  start: Rocket,
  celebrate: PartyPopper,
};

export function RetroBoard({
  boardId,
  sprintId,
  sprintName,
  initialNotes,
  initialSummary,
  members,
  currentUserId,
  aiEnabled,
}: {
  boardId: string;
  sprintId: string;
  sprintName: string;
  initialNotes: RetroNoteRow[];
  initialSummary: RetroSummaryRow | null;
  members: MemberWithProfile[];
  currentUserId: string;
  aiEnabled: boolean;
}) {
  const [notes, setNotes] = useState<RetroNoteRow[]>(initialNotes);

  const upsert = (note: RetroNoteRow) =>
    setNotes((prev) =>
      [...prev.filter((n) => n.id !== note.id), note].sort((a, b) => a.created_at.localeCompare(b.created_at))
    );
  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  useRetroRealtime({ sprintId, onUpsert: upsert, onDelete: remove });

  const byKind = useMemo(() => {
    const map = new Map<RetroKind, RetroNoteRow[]>(RETRO_COLUMNS.map((c) => [c.kind, []]));
    for (const note of notes) map.get(note.kind)?.push(note);
    return map;
  }, [notes]);

  const contributors = new Set(notes.map((n) => n.author_id).filter(Boolean)).size;
  const nameOf = (id: string | null) =>
    (id && members.find((m) => m.user_id === id)?.profiles?.name) || "Former member";

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {notes.length === 0
          ? `Add your notes for ${sprintName}. Everyone on the board sees them appear live.`
          : `${notes.length} ${notes.length === 1 ? "note" : "notes"} from ${contributors} ${
              contributors === 1 ? "person" : "people"
            } for ${sprintName}.`}
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {RETRO_COLUMNS.map((column) => {
          const Icon = ICONS[column.kind];
          const columnNotes = byKind.get(column.kind) ?? [];
          return (
            <section
              key={column.kind}
              aria-label={column.title}
              className="flex min-h-64 flex-col rounded-lg bg-muted/50 p-2"
            >
              <header className="px-1 pb-2">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" />
                  {column.title}
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">{columnNotes.length}</span>
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{column.prompt}</p>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {columnNotes.map((note) => (
                  <RetroNoteCard
                    key={note.id}
                    note={note}
                    authorName={nameOf(note.author_id)}
                    isMine={note.author_id === currentUserId}
                    onSaved={upsert}
                    onDeleted={remove}
                  />
                ))}
              </div>

              <AddNote
                onAdd={async (body) => {
                  const result = await addRetroNote(boardId, sprintId, column.kind, body);
                  if (result.error || !result.note) {
                    toast.error(result.error ?? "Could not add note.");
                    return false;
                  }
                  upsert(result.note);
                  return true;
                }}
              />
            </section>
          );
        })}
      </div>

      <RetroStory
        boardId={boardId}
        sprintId={sprintId}
        sprintName={sprintName}
        notes={notes}
        initialSummary={initialSummary}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}

function RetroNoteCard({
  note,
  authorName,
  isMine,
  onSaved,
  onDeleted,
}: {
  note: RetroNoteRow;
  authorName: string;
  isMine: boolean;
  onSaved: (note: RetroNoteRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  async function save() {
    const body = draft.trim();
    setEditing(false);
    if (!body || body === note.body) {
      setDraft(note.body);
      return;
    }
    onSaved({ ...note, body });
    const result = await updateRetroNote(note.id, body);
    if (result.error) {
      onSaved(note);
      setDraft(note.body);
      toast.error("Could not save note", { description: result.error });
    }
  }

  async function remove() {
    onDeleted(note.id);
    const result = await deleteRetroNote(note.id);
    if (result.error) {
      onSaved(note);
      toast.error("Could not delete note", { description: result.error });
    }
  }

  return (
    <article className="group rounded-md border bg-card p-3 text-sm shadow-sm">
      {editing ? (
        <Textarea
          value={draft}
          autoFocus
          rows={3}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(note.body);
              setEditing(false);
            }
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap leading-snug">{note.body}</p>
      )}
      <footer className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{isMine ? "You" : authorName}</span>
        {isMine && !editing && (
          <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Button variant="ghost" size="icon-xs" aria-label="Edit note" onClick={() => setEditing(true)}>
              <Pencil className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Delete note" onClick={remove}>
              <Trash2 className="size-3" />
            </Button>
          </span>
        )}
      </footer>
    </article>
  );
}

function AddNote({ onAdd }: { onAdd: (body: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!body.trim() || pending) return;
    setPending(true);
    const ok = await onAdd(body);
    setPending(false);
    if (ok) setBody("");
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add a note
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        value={body}
        autoFocus
        rows={3}
        maxLength={1000}
        placeholder="Type your note…"
        className="bg-card"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending || !body.trim()} onClick={submit}>
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Done
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">Enter to add · Shift+Enter for a new line</span>
      </div>
    </div>
  );
}
