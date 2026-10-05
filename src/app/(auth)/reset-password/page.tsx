import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

// Reached from the reset email via /auth/confirm, which signs the person in
// for this one purpose. Without that session the link has expired.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset link expired</CardTitle>
          <CardDescription>
            Reset links work once and expire after an hour. Request a new one to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" nativeButton={false} render={<Link href="/forgot-password" />}>
            Send a new reset link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm email={user.email ?? ""} />;
}
