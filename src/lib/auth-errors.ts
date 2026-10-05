import type { AuthError } from "@supabase/supabase-js";

type Action = "sign-in" | "sign-up" | "password-reset" | "password-update";

export const ACCESS_EMAIL = "info@222.solutions";
export const INVITE_ONLY_MESSAGE = `Sign-up is by invitation only. To ask for access, email ${ACCESS_EMAIL}.`;

// Turn a Supabase auth error into something a person can act on, and log
// the raw details (visible in Vercel's function logs) for debugging. Some
// failures, such as the email service timing out, arrive with an empty
// message like "{}", which is useless to show.
export function authErrorMessage(error: AuthError, action: Action): string {
  console.error(`[auth] ${action} failed`, {
    name: error.name,
    status: error.status,
    code: error.code,
    message: error.message,
  });

  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match.";
    case "email_not_confirmed":
      return "Confirm your email first. Check your inbox for the confirmation link.";
    case "user_already_exists":
      return "There's already an account with that email. Sign in instead.";
    case "email_address_invalid":
      return "That email address doesn't look right.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many emails requested. Wait a minute and try again.";
    case "email_address_not_authorized":
      return "We can't send email to that address yet. Ask your admin to finish the email setup.";
    case "signup_disabled":
      return INVITE_ONLY_MESSAGE;
    case "same_password":
      return "That's your current password. Choose a different one.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
  }

  // The database's invite-only check rejects the new user row, which
  // Supabase reports as a generic "Database error saving new user".
  if (action === "sign-up" && /database error saving new user/i.test(error.message)) {
    return INVITE_ONLY_MESSAGE;
  }

  // Sign-up may send a confirmation email (when that's switched on in Supabase).
  const unreadable = !error.message || /^\s*\{\s*\}\s*$/.test(error.message);
  if (action === "sign-up" && (unreadable || (error.status ?? 0) >= 500)) {
    return "We couldn't finish signing you up just now. Try again in a minute.";
  }
  if (action === "password-reset" && (unreadable || (error.status ?? 0) >= 500)) {
    return "We couldn't send the reset email just now. Try again in a minute.";
  }
  if (unreadable) {
    return "Something went wrong. Please try again.";
  }
  return error.message;
}
