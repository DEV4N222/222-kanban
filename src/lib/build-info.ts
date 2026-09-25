// Values are baked in at build time by next.config.ts.
const sha = process.env.BUILD_COMMIT_SHA ?? "";
const time = process.env.BUILD_TIME ?? "";

export type BuildEnvironment = "production" | "preview" | "development" | "local";

export const buildInfo = {
  sha,
  shortSha: sha.slice(0, 7) || "unknown",
  message: process.env.BUILD_COMMIT_MESSAGE ?? "",
  branch: process.env.BUILD_BRANCH ?? "",
  environment: (process.env.BUILD_ENV ?? "local") as BuildEnvironment,
  deploymentId: process.env.BUILD_DEPLOYMENT_ID ?? "",
  uncommitted: process.env.BUILD_UNCOMMITTED === "true",
  time,
  commitUrl: sha ? `https://github.com/${process.env.BUILD_REPO}/commit/${sha}` : null,
};

function londonParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** e.g. "2026.09.25-7b9dcb3": build date plus commit, easy to quote in a bug report. */
export const buildVersion = (() => {
  if (!time) return buildInfo.shortSha;
  const { year, month, day } = londonParts(time);
  return `${year}.${month}.${day}-${buildInfo.shortSha}`;
})();

/** e.g. "25 Sept 2026, 14:32 BST" in UK time. */
export function formatBuildTime(iso: string): string {
  if (!iso) return "unknown";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
