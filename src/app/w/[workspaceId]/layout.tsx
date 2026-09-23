import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/actions/auth";
import { Settings } from "lucide-react";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) {
    notFound();
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href={`/w/${workspaceId}`} className="flex items-center gap-2 font-semibold">
            <Logo size={26} />
            {workspace.name}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href={`/w/${workspaceId}/settings`} />}
          >
            <Settings className="size-4" />
          </Button>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
