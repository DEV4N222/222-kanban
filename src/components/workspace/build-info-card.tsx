"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildInfo, buildVersion, type BuildEnvironment } from "@/lib/build-info";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink } from "lucide-react";

const ENVIRONMENTS: Record<BuildEnvironment, { label: string; className: string }> = {
  production: { label: "Production", className: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" },
  preview: { label: "Preview", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  development: { label: "Development", className: "bg-muted text-muted-foreground" },
  local: { label: "Local", className: "bg-muted text-muted-foreground" },
};

export function BuildInfoCard({ builtAt }: { builtAt: string }) {
  const [copied, setCopied] = useState(false);
  const env = ENVIRONMENTS[buildInfo.environment] ?? ENVIRONMENTS.local;

  const summary = [
    `Version: ${buildVersion}${buildInfo.uncommitted ? " (with uncommitted changes)" : ""}`,
    `Environment: ${env.label}`,
    `Commit: ${buildInfo.sha || "unknown"}${buildInfo.message ? ` — ${buildInfo.message}` : ""}`,
    buildInfo.branch && `Branch: ${buildInfo.branch}`,
    `Built: ${builtAt}`,
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
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-medium">{buildVersion}</span>
            <Badge className={cn(env.className)}>{env.label}</Badge>
            {buildInfo.uncommitted && (
              <span className="text-xs text-muted-foreground">+ uncommitted changes</span>
            )}
          </dd>

          <dt className="text-muted-foreground">Commit</dt>
          <dd className="min-w-0">
            {buildInfo.commitUrl ? (
              <a
                href={buildInfo.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline"
              >
                {buildInfo.shortSha}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="font-mono">unknown</span>
            )}
            {buildInfo.message && (
              <span className="block truncate text-muted-foreground" title={buildInfo.message}>
                {buildInfo.message}
              </span>
            )}
          </dd>

          {buildInfo.branch && (
            <>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="font-mono">{buildInfo.branch}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Built</dt>
          <dd>{builtAt}</dd>

          {buildInfo.deploymentId && (
            <>
              <dt className="text-muted-foreground">Deployment</dt>
              <dd className="truncate font-mono text-xs leading-5 text-muted-foreground">
                {buildInfo.deploymentId}
              </dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
