import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { acceptInvite } from "@/lib/actions/workspaces";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  const acceptWithToken = async () => {
    "use server";
    const result = await acceptInvite(token);
    if (result?.error) {
      redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`);
    }
  };

  const switchAccount = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/login?next=/invite/${token}`);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={48} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a workspace. You&apos;re signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">
              {error}. Invites only work for the email address they were sent to, and expire after
              7 days.
            </p>
          )}
          <form action={acceptWithToken}>
            <Button type="submit" className="w-full">
              Accept invite
            </Button>
          </form>
          <form action={switchAccount}>
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Not you? Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
