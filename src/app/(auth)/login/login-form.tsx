"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signInWithMagicLink } from "@/lib/actions/auth";

type ActionState = { error?: string; success?: boolean } | null;

export function LoginForm({ next, linkError }: { next: string | null; linkError: string | null }) {
  const [mode, setMode] = useState<"password" | "magic-link">(linkError ? "magic-link" : "password");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) =>
      mode === "password"
        ? ((await signIn(formData)) ?? null)
        : ((await signInWithMagicLink(formData)) ?? null),
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {next?.startsWith("/invite/")
            ? "You've been invited to a workspace. Sign in, or sign up with the email address the invite was sent to."
            : "222 Solutions Kanban"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          {mode === "password" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          )}

          {linkError && !state && <p className="text-sm text-destructive">{linkError}</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && mode === "magic-link" && (
            <p className="text-sm text-muted-foreground">
              Check your email for a sign-in link.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "..." : mode === "password" ? "Sign in" : "Send magic link"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
          className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
        >
          {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
        </button>

        <p className="mt-4 text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
