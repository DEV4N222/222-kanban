import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/components/workspace/invite-form";
import { CopyInviteLink } from "@/components/workspace/copy-invite-link";
import { BuildInfoCard } from "@/components/workspace/build-info-card";
import { MemberRoleSelect } from "@/components/workspace/member-role-select";
import { buildInfo, formatBuildTime } from "@/lib/build-info";
import { removeMember, revokeInvite } from "@/lib/actions/invites";

type InviteStatus = { kind: "pending" | "accepted" | "expired"; detail: string; sortKey: string };

const DAY_MS = 24 * 60 * 60 * 1000;

// Server-rendered per request, so reading the clock here is fine.
function inviteStatus(invite: { accepted_at: string | null; expires_at: string }): InviteStatus {
  if (invite.accepted_at) {
    return { kind: "accepted", detail: `Accepted ${format(new Date(invite.accepted_at), "d MMM yyyy")}`, sortKey: `3-${invite.accepted_at}` };
  }
  const msLeft = new Date(invite.expires_at).getTime() - Date.now();
  if (msLeft <= 0) {
    return { kind: "expired", detail: `Expired ${format(new Date(invite.expires_at), "d MMM")}`, sortKey: `2-${invite.expires_at}` };
  }
  const hours = Math.ceil(msLeft / (60 * 60 * 1000));
  const days = Math.floor(msLeft / DAY_MS);
  const detail =
    msLeft < DAY_MS
      ? `Expires in ${hours} ${hours === 1 ? "hour" : "hours"}`
      : `Expires in ${days} ${days === 1 ? "day" : "days"}`;
  return { kind: "pending", detail, sortKey: `1-${invite.expires_at}` };
}

const STATUS_STYLE: Record<InviteStatus["kind"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  accepted: { label: "Accepted", className: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" },
  expired: { label: "Expired", className: "bg-destructive/10 text-destructive" },
};

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
      .select("id, email, role, token, expires_at, accepted_at")
      .eq("workspace_id", workspaceId),
  ]);

  if (!members) {
    notFound();
  }

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  // Pending first (soonest to expire), then expired, then accepted (newest first).
  const invitesWithStatus = (invites ?? [])
    .map((invite) => ({ ...invite, status: inviteStatus(invite) }))
    .sort((a, b) =>
      a.status.kind === "accepted" && b.status.kind === "accepted"
        ? b.status.sortKey.localeCompare(a.status.sortKey)
        : a.status.sortKey.localeCompare(b.status.sortKey)
    );
  const counts = (["pending", "accepted", "expired"] as const)
    .map((kind) => [kind, invitesWithStatus.filter((i) => i.status.kind === kind).length] as const)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => `${n} ${kind}`)
    .join(" · ");

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
                {isOwner && m.role !== "owner" ? (
                  <MemberRoleSelect
                    workspaceId={workspaceId}
                    userId={m.user_id}
                    name={m.profiles?.name ?? "This person"}
                    role={m.role === "admin" ? "admin" : "member"}
                  />
                ) : (
                  <Badge variant="secondary">{m.role}</Badge>
                )}
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

            {invitesWithStatus.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">Invites</p>
                  <p className="text-xs text-muted-foreground">{counts}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Invites aren&apos;t emailed automatically. Copy the link and send it to your
                  teammate; they sign up with that email address to join.
                </p>
                {invitesWithStatus.map((invite) => {
                  const style = STATUS_STYLE[invite.status.kind];
                  return (
                    <div key={invite.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">
                          {invite.email} <span className="text-muted-foreground">({invite.role})</span>
                        </p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge className={style.className}>{style.label}</Badge>
                          {invite.status.detail}
                        </p>
                      </div>
                      {invite.status.kind !== "accepted" && (
                        <div className="flex shrink-0 items-center gap-1">
                          {invite.status.kind === "pending" && (
                            <CopyInviteLink token={invite.token} email={invite.email} />
                          )}
                          <form action={revokeInvite.bind(null, invite.id, workspaceId)}>
                            <Button variant="ghost" size="sm" type="submit">
                              {invite.status.kind === "expired" ? "Remove" : "Revoke"}
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <BuildInfoCard builtAt={formatBuildTime(buildInfo.time)} />
    </div>
  );
}
