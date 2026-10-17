import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

const MODEL = "claude-opus-5";

/**
 * One structured-output request to Claude. Tries with server-side refusal
 * fallbacks first; if the account or API rejects that option (a 400 that
 * mentions it), retries once without it rather than failing.
 */
export async function askClaudeForJson<S extends z.ZodType>({
  schema,
  system,
  user,
  timeoutMs,
}: {
  schema: S;
  system: string;
  user: string;
  timeoutMs?: number;
}): Promise<{ output: z.infer<S> | null; refused: boolean }> {
  const client = new Anthropic(timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : {});
  const base = {
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" as const, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user" as const, content: user }],
  };

  let response;
  try {
    response = await client.beta.messages.parse({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (!(error instanceof Anthropic.BadRequestError) || !/fallback|beta/i.test(apiMessage(error))) throw error;
    console.warn("[ai] fallbacks rejected, retrying without them:", apiMessage(error));
    response = await client.beta.messages.parse(base);
  }

  return { output: response.parsed_output ?? null, refused: response.stop_reason === "refusal" };
}

/** The reason Anthropic gave, from the error body when there is one. */
function apiMessage(error: InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? error.message;
}

/** A plain-English explanation of a failed Claude call, for showing in the app. */
export function describeClaudeError(error: unknown): { message: string; notConfigured: boolean } {
  if (error instanceof Anthropic.AuthenticationError) {
    return { message: "The ANTHROPIC_API_KEY isn't valid. Check it in Vercel's environment variables.", notConfigured: true };
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return { message: `The API key isn't allowed to do this: ${apiMessage(error)}`, notConfigured: true };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { message: "Too many requests right now. Try again in a minute.", notConfigured: false };
  }
  if (error instanceof Anthropic.APIError) {
    const reason = apiMessage(error);
    if (/credit balance/i.test(reason)) {
      return {
        message: "The Anthropic account has no API credit yet. Add credit in the Claude Console under Settings → Billing, then try again.",
        notConfigured: true,
      };
    }
    if (error.status === 529 || (error.status ?? 0) >= 500) {
      return { message: "The AI service is busy right now. Try again in a minute.", notConfigured: false };
    }
    return { message: `The AI service rejected the request (${error.status}): ${reason}`, notConfigured: false };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { message: "Couldn't reach the AI service. Try again in a minute.", notConfigured: false };
  }
  return { message: error instanceof Error ? error.message : String(error), notConfigured: false };
}
