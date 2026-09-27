import type { AuthError } from "@supabase/supabase-js";

type Action = "sign-in" | "sign-up" | "magic-link";

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
  }

  const sendsEmail = action !== "sign-in";
  const unreadable = !error.message || /^\s*\{\s*\}\s*$/.test(error.message);
  if (sendsEmail && (unreadable || (error.status ?? 0) >= 500)) {
    return "We couldn't send the email just now. Try again in a minute, or sign in with your password.";
  }
  if (unreadable) {
    return "Something went wrong. Please try again.";
  }
  return error.message;
}
