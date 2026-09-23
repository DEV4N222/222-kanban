"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSprint, deleteSprint, setSprintStatus } from "@/lib/actions/sprints";
import type { SprintRow, SprintStatus } from "@/lib/types";
import { CalendarClock, Trash2 } from "lucide-react";

export function SprintDialog({
  boardId,
  sprints,
  onSprintsChange,
}: {
  boardId: string;
  sprints: SprintRow[];
  onSprintsChange: (sprints: SprintRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("start_date", startDate);
    formData.set("end_date", endDate);
    formData.set("goal", goal);

    const result = await createSprint(boardId, formData);
    if (result.error || !result.sprint) {
      setError(result.error ?? "Could not create sprint.");
      return;
    }
    onSprintsChange([result.sprint as SprintRow, ...sprints]);
    setName("");
    setStartDate("");
    setEndDate("");
    setGoal("");
    setError(null);
  }

  async function handleStatusChange(sprintId: string, status: SprintStatus) {
    onSprintsChange(sprints.map((s) => (s.id === sprintId ? { ...s, status } : s)));
    await setSprintStatus(sprintId, status);
  }

  async function handleDelete(sprintId: string) {
    onSprintsChange(sprints.filter((s) => s.id !== sprintId));
    await deleteSprint(sprintId);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClock className="size-4" />
        Sprints
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sprints</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {sprints.length === 0 && (
            <p className="text-sm text-muted-foreground">No sprints yet.</p>
          )}
          {sprints.map((sprint) => (
            <div key={sprint.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">{sprint.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(sprint.start_date), "MMM d")} –{" "}
                  {format(new Date(sprint.end_date), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={sprint.status}
                  onValueChange={(value) => handleStatusChange(sprint.id, value as SprintStatus)}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue>
                      {(value: SprintStatus) =>
                        ({ planned: "Planned", active: "Active", completed: "Completed" })[value]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(sprint.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">New sprint</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Goal (optional)</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="sm" onClick={handleCreate}>
            Create sprint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
