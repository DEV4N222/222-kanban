// Where to send someone after they sign in or confirm their email. Only
// same-site paths are allowed, so a crafted `?next=` can't bounce people to
// another site.
export function safeNext(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
