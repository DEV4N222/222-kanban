"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { authErrorMessage, INVITE_ONLY_MESSAGE } from "@/lib/auth-errors";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !password || !name) {
    return { error: "All fields are required." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  // Sign-up is invite-only (enforced in the database; see
  // 0005_invite_only_signup.sql). Check first so we can say so plainly.
  const { data: allowed, error: checkError } = await supabase.rpc("can_sign_up", { _email: email });
  if (!checkError && allowed === false) {
    return { error: INVITE_ONLY_MESSAGE };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next ?? "/onboarding")}`,
    },
  });

  if (error) {
    return { error: authErrorMessage(error, "sign-up") };
  }

  // Email confirmation may be disabled (e.g. local/dev projects), in which
  // case signUp already returns an active session and there's no email to check.
  if (data.session) {
    redirect(next ?? "/");
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error, "sign-in") };
  }

  redirect(next ?? "/");
}


export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });

  // Supabase answers the same whether or not the account exists, so the page
  // never reveals who has an account; only real failures (rate limits, the
  // email service being down) are reported.
  if (error) {
    return { error: authErrorMessage(error, "password-reset") };
  }
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one from the sign-in page." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: authErrorMessage(error, "password-update") };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
