"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateRetroSummary } from "@/lib/actions/retro";
import type { RetroNoteRow, RetroSummaryRow } from "@/lib/types";
import { BookOpen, Loader2, RefreshCw, Sparkles } from "lucide-react";

export function RetroStory({
  boardId,
  sprintId,
  sprintName,
  notes,
  initialSummary,
  aiEnabled,
}: {
  boardId: string;
  sprintId: string;
  sprintName: string;
  notes: RetroNoteRow[];
  initialSummary: RetroSummaryRow | null;
  aiEnabled: boolean;
}) {
  const [summary, setSummary] = useState<RetroSummaryRow | null>(initialSummary);
  const [pending, setPending] = useState(false);

  // Notes added, edited or removed since the story was written.
  const changedSince = summary
    ? notes.filter((n) => n.updated_at > summary.generated_at || n.created_at > summary.generated_at).length +
      Math.max(0, summary.note_count - notes.length)
    : 0;

  async function generate() {
    setPending(true);
    const result = await generateRetroSummary(boardId, sprintId);
    setPending(false);
    if ("error" in result) {
      toast.error("Couldn't write the retro story", { description: result.error });
      return;
    }
    setSummary(result.summary);
    toast.success("Retro story ready");
  }

  const canGenerate = aiEnabled && notes.length > 0 && !pending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-muted-foreground" />
            Retro story
          </CardTitle>
          <CardDescription>
            A short story of {sprintName}, written by AI from everyone&apos;s notes. Notes are shared
            without names.
          </CardDescription>
        </div>
        {summary && (
          <Button variant="outline" size="sm" disabled={!canGenerate} onClick={generate}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {pending ? "Writing…" : "Regenerate"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            {summary.themes.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Themes">
                {summary.themes.map((theme) => (
                  <li key={theme} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {theme}
                  </li>
                ))}
              </ul>
            )}
            <div className="max-w-prose space-y-3 text-sm leading-relaxed">
              {summary.story
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Written {format(new Date(summary.generated_at), "d MMM yyyy, HH:mm")} from {summary.note_count}{" "}
              {summary.note_count === 1 ? "note" : "notes"}
              {changedSince > 0 &&
                ` · ${changedSince} ${changedSince === 1 ? "change" : "changes"} since — regenerate to include ${
                  changedSince === 1 ? "it" : "them"
                }`}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              {notes.length === 0
                ? "Once the team has added notes, turn them into a short story of the sprint and its themes."
                : `Turn the team's ${notes.length} ${notes.length === 1 ? "note" : "notes"} into a short story of the sprint and its themes.`}
            </p>
            <Button disabled={!canGenerate} onClick={generate}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {pending ? "Writing the story…" : "Write the retro story"}
            </Button>
          </div>
        )}
        {!aiEnabled && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            AI summaries aren&apos;t switched on for this site yet. An admin needs to add an{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> to the app&apos;s environment settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
