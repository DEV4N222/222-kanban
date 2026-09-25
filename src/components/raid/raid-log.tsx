"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaidItemDialog } from "./raid-item-dialog";
import { RAID_STATUSES, RAID_TYPES, raidRating, raidRef, raidTypeMeta } from "@/lib/raid";
import type { MemberWithProfile, RaidItemRow, RaidLevel, RaidType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type Filter = RaidType | "all";

const RATING_STYLE: Record<RaidLevel, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
};

const TYPE_ORDER: Record<RaidType, number> = { risk: 0, assumption: 1, issue: 2, decision: 3 };

export function RaidLog({
  workspaceId,
  boardId,
  items,
  members,
}: {
  workspaceId: string;
  boardId: string;
  items: RaidItemRow[];
  members: MemberWithProfile[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RaidItemRow | null>(null);
  const [today] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const openCounts = useMemo(() => {
    const counts: Record<Filter, number> = { all: 0, risk: 0, assumption: 0, issue: 0, decision: 0 };
    for (const item of items) {
      if (item.status === "closed") continue;
      counts.all++;
      counts[item.type]++;
    }
    return counts;
  }, [items]);

  const visible = useMemo(
    () =>
      items
        .filter((i) => (filter === "all" || i.type === filter) && (showClosed || i.status !== "closed"))
        .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.number - b.number),
    [items, filter, showClosed]
  );

  const closedHidden = items.filter(
    (i) => i.status === "closed" && (filter === "all" || i.type === filter)
  ).length;

  const memberName = (id: string | null) =>
    id ? (members.find((m) => m.user_id === id)?.profiles?.name ?? "Unknown") : null;

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openItem(item: RaidItemRow) {
    setEditing(item);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by type">
          {(["all", ...RAID_TYPES.map((t) => t.value)] as Filter[]).map((value) => (
            <Button
              key={value}
              size="sm"
              role="tab"
              aria-selected={filter === value}
              variant={filter === value ? "secondary" : "ghost"}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All" : raidTypeMeta(value).plural}
              <span className="text-muted-foreground tabular-nums">{openCounts[value]}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="size-4 accent-primary"
            />
            Show closed
          </label>
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" />
            Add {filter === "all" ? "item" : raidTypeMeta(filter).label.toLowerCase()}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-16 px-3 py-2 font-medium">Ref</th>
              {filter === "all" && <th className="w-28 px-3 py-2 font-medium">Type</th>}
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="w-36 px-3 py-2 font-medium">Owner</th>
              <th className="w-28 px-3 py-2 font-medium">Rating</th>
              <th className="w-28 px-3 py-2 font-medium">Status</th>
              <th className="w-28 px-3 py-2 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const rating = raidRating(item);
              const overdue = item.status !== "closed" && item.due_date !== null && item.due_date < today;
              return (
                <tr
                  key={item.id}
                  onClick={() => openItem(item)}
                  className={cn(
                    "cursor-pointer border-b last:border-b-0 hover:bg-muted/40",
                    item.status === "closed" && "text-muted-foreground"
                  )}
                >
                  <td className="px-3 py-2.5 align-top font-medium tabular-nums">
                    <button
                      type="button"
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openItem(item);
                      }}
                    >
                      {raidRef(item)}
                    </button>
                  </td>
                  {filter === "all" && (
                    <td className="px-3 py-2.5 align-top text-muted-foreground">{raidTypeMeta(item.type).label}</td>
                  )}
                  <td className="px-3 py-2.5 align-top">
                    <p className={cn("font-medium", item.status === "closed" && "line-through")}>{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {memberName(item.owner_id) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {rating ? (
                      <Badge
                        className={RATING_STYLE[rating]}
                        title={
                          item.type === "risk" && item.likelihood
                            ? `Impact ${item.impact} × likelihood ${item.likelihood}`
                            : `Impact ${item.impact}`
                        }
                      >
                        {rating[0].toUpperCase() + rating.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {RAID_STATUSES.find((s) => s.value === item.status)?.label}
                  </td>
                  <td className={cn("px-3 py-2.5 align-top tabular-nums", overdue && "font-medium text-destructive")}>
                    {item.due_date ? format(new Date(`${item.due_date}T00:00`), "d MMM yyyy") : "—"}
                    {overdue && <span className="block text-xs">Overdue</span>}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={filter === "all" ? 7 : 6} className="px-3 py-10 text-center text-muted-foreground">
                  {items.length === 0
                    ? "No RAID items yet. Add the first risk, assumption, issue or decision."
                    : closedHidden > 0
                      ? `Nothing open here. ${closedHidden} closed ${closedHidden === 1 ? "item is" : "items are"} hidden.`
                      : "Nothing here yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RaidItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        boardId={boardId}
        members={members}
        item={editing}
        defaultType={filter === "all" ? "risk" : filter}
      />
    </div>
  );
}
