import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  "invalid-link":
    "That sign-in link has expired or was already used. Links work once and expire after an hour — request a new one below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <LoginForm next={safeNext(next)} linkError={error ? (ERRORS[error] ?? null) : null} />;
}
