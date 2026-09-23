import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { acceptInvite } from "@/lib/actions/workspaces";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  const acceptWithToken = async () => {
    "use server";
    await acceptInvite(token);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={48} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
          <CardDescription>You&apos;ve been invited to join a workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptWithToken}>
            <Button type="submit" className="w-full">
              Accept invite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
