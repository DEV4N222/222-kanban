import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/components/workspace/invite-form";
import { removeMember, revokeInvite } from "@/lib/actions/invites";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles(name, avatar_url)")
      .eq("workspace_id", workspaceId),
    supabase
      .from("invites")
      .select("id, email, role, expires_at")
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null),
  ]);

  if (!members) {
    notFound();
  }

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Workspace settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{m.profiles?.name ?? "Unknown"}</span>
                <Badge variant="secondary">{m.role}</Badge>
              </div>
              {canManage && m.role !== "owner" && m.user_id !== user?.id && (
                <form action={removeMember.bind(null, workspaceId, m.user_id)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a teammate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InviteForm workspaceId={workspaceId} />

            {invites && invites.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between text-sm">
                    <span>
                      {invite.email} <span className="text-muted-foreground">({invite.role})</span>
                    </span>
                    <form action={revokeInvite.bind(null, invite.id, workspaceId)}>
                      <Button variant="ghost" size="sm" type="submit">
                        Revoke
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
