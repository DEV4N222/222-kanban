import Link from "next/link";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "invite", "recovery", "email_change"];

// Email links land here and wait for a click before signing in. Opening the
// link alone does nothing: mail scanners such as Microsoft 365 Safe Links
// open every link in an email, which would otherwise use up the one-time
// token before the person clicks it.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next) ?? "/";
  const type = OTP_TYPES.includes(params.type as EmailOtpType) ? (params.type as EmailOtpType) : null;
  const tokenHash = params.token_hash && type ? params.token_hash : null;
  // Supabase's default email templates send a PKCE `code` instead of a
  // token hash; that only works in the browser that asked for the link.
  const code = !tokenHash && params.code ? params.code : null;

  const confirm = async () => {
    "use server";
    const supabase = await createClient();
    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!);
    redirect(error ? "/login?error=invalid-link" : next);
  };

  const usable = Boolean(tokenHash || code);
  const isSignup = type === "signup";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={48} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{usable ? (isSignup ? "Confirm your email" : "Sign in to 222 Kanban") : "Link not valid"}</CardTitle>
          <CardDescription>
            {usable
              ? "Click continue to finish signing in."
              : (params.error_description ??
                "This sign-in link is incomplete, has expired or was already used.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usable ? (
            <form action={confirm}>
              <Button type="submit" className="w-full" autoFocus>
                Continue
              </Button>
            </form>
          ) : (
            <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
              Back to sign in
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
