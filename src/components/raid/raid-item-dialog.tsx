"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRaidItem, deleteRaidItem, updateRaidItem } from "@/lib/actions/raid";
import { RAID_LEVELS, RAID_STATUSES, RAID_TYPES, raidRef, raidTypeMeta } from "@/lib/raid";
import type { MemberWithProfile, RaidItemRow, RaidType } from "@/lib/types";

const NONE = "__none__";

export function RaidItemDialog({
  open,
  onOpenChange,
  workspaceId,
  boardId,
  members,
  item,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  boardId: string;
  members: MemberWithProfile[];
  /** The item being edited, or null to add a new one. */
  item: RaidItemRow | null;
  defaultType: RaidType;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && (
          <RaidItemForm
            key={item?.id ?? "new"}
            workspaceId={workspaceId}
            boardId={boardId}
            members={members}
            item={item}
            defaultType={defaultType}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RaidItemForm({
  workspaceId,
  boardId,
  members,
  item,
  defaultType,
  onDone,
}: {
  workspaceId: string;
  boardId: string;
  members: MemberWithProfile[];
  item: RaidItemRow | null;
  defaultType: RaidType;
  onDone: () => void;
}) {
  const [type, setType] = useState<RaidType>(item?.type ?? defaultType);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = raidTypeMeta(type);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    formData.set("type", type);
    const result = item
      ? await updateRaidItem(workspaceId, boardId, item.id, formData)
      : await createRaidItem(workspaceId, boardId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(item ? `${raidRef(item)} updated` : `${meta.label} added`);
    onDone();
  }

  async function handleDelete() {
    if (!item) return;
    setPending(true);
    const result = await deleteRaidItem(workspaceId, boardId, item.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(`${raidRef(item)} deleted`);
    onDone();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{item ? `${raidRef(item)} · ${meta.label}` : `Add ${meta.label.toLowerCase()}`}</DialogTitle>
      </DialogHeader>

      {!item && (
        <div className="flex flex-wrap gap-1">
          {RAID_TYPES.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="sm"
              variant={t.value === type ? "secondary" : "ghost"}
              aria-pressed={t.value === type}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="raid-title">Title</Label>
        <Input id="raid-title" name="title" required defaultValue={item?.title} autoFocus />
      </div>

      <div className="space-y-1">
        <Label htmlFor="raid-description">Description</Label>
        <Textarea id="raid-description" name="description" rows={3} defaultValue={item?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Owner</Label>
          <Select name="owner_id" defaultValue={item?.owner_id ?? NONE}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) =>
                  value === NONE
                    ? "Unassigned"
                    : (members.find((m) => m.user_id === value)?.profiles?.name ?? "Unknown")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profiles?.name ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select name="status" defaultValue={item?.status ?? "open"}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) => RAID_STATUSES.find((s) => s.value === value)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RAID_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="raid-due">{type === "decision" ? "Decision date" : "Due date"}</Label>
          <Input id="raid-due" name="due_date" type="date" defaultValue={item?.due_date ?? ""} />
        </div>

        <LevelSelect name="impact" label="Impact" defaultValue={item?.impact ?? null} />
        {type === "risk" && (
          <LevelSelect name="likelihood" label="Likelihood" defaultValue={item?.likelihood ?? null} />
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="raid-action">{meta.actionLabel}</Label>
        <Textarea id="raid-action" name="action" rows={3} defaultValue={item?.action ?? ""} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter className="gap-2 sm:justify-between">
        {item ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Delete {raidRef(item)}?</span>
              <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
                Delete
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : item ? "Save changes" : `Add ${meta.label.toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LevelSelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select name={name} defaultValue={defaultValue ?? NONE}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(value: string) => RAID_LEVELS.find((l) => l.value === value)?.label ?? "Not set"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {RAID_LEVELS.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
