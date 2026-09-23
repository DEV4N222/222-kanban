"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import type { ColumnRow } from "@/lib/types";

export function ColumnMenu({
  column,
  onRename,
  onDelete,
  onUpdateSettings,
}: {
  column: ColumnRow;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdateSettings: (fields: { is_done?: boolean; wip_limit?: number | null }) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(column.name);
  const [wipOpen, setWipOpen] = useState(false);
  const [wipLimit, setWipLimit] = useState(column.wip_limit?.toString() ?? "");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-6" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setWipOpen(true)}>Set WIP limit</DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={column.is_done}
            onCheckedChange={(checked) => onUpdateSettings({ is_done: checked })}
          >
            Counts as &quot;Done&quot;
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button
              onClick={() => {
                onRename(name);
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wipOpen} onOpenChange={setWipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WIP limit</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Max cards (leave blank for no limit)</Label>
            <Input
              type="number"
              min={0}
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                onUpdateSettings({ wip_limit: wipLimit ? Number(wipLimit) : null });
                setWipOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
