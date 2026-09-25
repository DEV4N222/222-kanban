"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildInfo, buildVersion, type BuildEnvironment } from "@/lib/build-info";
import { Check, Copy } from "lucide-react";

const ENVIRONMENT_LABELS: Record<BuildEnvironment, string> = {
  production: "Production",
  preview: "Preview",
  development: "Development",
  local: "Local",
};

export function BuildInfoCard({ builtAt }: { builtAt: string }) {
  const [copied, setCopied] = useState(false);

  // The card shows version and build time only; the copied text keeps the
  // full details for bug reports.
  const summary = [
    `Version: ${buildVersion}${buildInfo.uncommitted ? " (with uncommitted changes)" : ""}`,
    `Built: ${builtAt}`,
    `Environment: ${ENVIRONMENT_LABELS[buildInfo.environment] ?? "Local"}`,
    `Commit: ${buildInfo.sha || "unknown"}${buildInfo.message ? ` — ${buildInfo.message}` : ""}`,
    buildInfo.branch && `Branch: ${buildInfo.branch}`,
    buildInfo.deploymentId && `Deployment: ${buildInfo.deploymentId}`,
  ]
    .filter(Boolean)
    .join("\n");

  async function copy() {
    const text = `${summary}\nPage: ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Build info copied", { description: "Paste it into your bug report." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the build info:", text);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Build</CardTitle>
          <CardDescription>The version of the app you&apos;re using right now.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy build info"}
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-mono font-medium">{buildVersion}</dd>

          <dt className="text-muted-foreground">Built</dt>
          <dd>{builtAt}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
