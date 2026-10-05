"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SprintRow } from "@/lib/types";
import { FileDown, Loader2 } from "lucide-react";

const STATUS: Record<SprintRow["status"], string> = { active: "Active", planned: "Planned", completed: "Completed" };

/** Top-bar "Report" menu: pick a sprint to download its PowerPoint report. */
export function ReportMenu({
  workspaceId,
  boardId,
  sprints,
  currentSprintId,
}: {
  workspaceId: string;
  boardId: string;
  sprints: SprintRow[];
  /** Listed first (the board's active or next planned sprint). */
  currentSprintId: string | null;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const ordered = [...sprints].sort((a, b) =>
    a.id === currentSprintId ? -1 : b.id === currentSprintId ? 1 : b.start_date.localeCompare(a.start_date)
  );

  async function download(sprint: SprintRow) {
    setPendingId(sprint.id);
    try {
      const response = await fetch(`/w/${workspaceId}/b/${boardId}/report?sprint=${sprint.id}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            (response.status === 504
              ? "The report took too long to build (the server timed out)."
              : `The server returned an error (HTTP ${response.status}).`)
        );
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const fileName = encoded ? decodeURIComponent(encoded) : `${sprint.name} - Sprint report.pptx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded", { description: fileName });
    } catch (error) {
      toast.error("Couldn't create the report", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPendingId(null);
    }
  }

  const pendingSprint = sprints.find((s) => s.id === pendingId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={!!pendingId} />}>
        {pendingId ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
        {pendingSprint ? `Building ${pendingSprint.name}…` : "Report"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download sprint report (.pptx)</DropdownMenuLabel>
          {ordered.length === 0 && (
            <DropdownMenuItem disabled>Create a sprint first</DropdownMenuItem>
          )}
          {ordered.map((sprint) => (
            <DropdownMenuItem key={sprint.id} onClick={() => download(sprint)}>
              <span className="flex-1 truncate">{sprint.name}</span>
              <span className="text-xs text-muted-foreground">{STATUS[sprint.status]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
