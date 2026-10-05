"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";

export function DownloadReportButton({
  workspaceId,
  boardId,
  sprintId,
  sprintName,
}: {
  workspaceId: string;
  boardId: string;
  sprintId: string;
  sprintName: string;
}) {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const response = await fetch(`/w/${workspaceId}/b/${boardId}/report?sprint=${sprintId}`);
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
      const fileName = encoded ? decodeURIComponent(encoded) : `${sprintName} - Sprint report.pptx`;

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
      setPending(false);
    }
  }

  return (
    <Button size="sm" onClick={download} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {pending ? "Building report…" : `${sprintName} report (.pptx)`}
    </Button>
  );
}
