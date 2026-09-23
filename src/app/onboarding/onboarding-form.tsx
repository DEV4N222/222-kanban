"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createWorkspace } from "@/lib/actions/workspaces";

type ActionState = { error?: string } | null;

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => (await createWorkspace(formData)) ?? null,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>This is where your team&apos;s boards will live.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" name="name" type="text" placeholder="222 Solutions" required />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "..." : "Create workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
