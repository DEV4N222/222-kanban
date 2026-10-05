import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Build details shown on the settings page, captured once at build time.
// Vercel provides the git details as system environment variables; local
// builds read them from git instead.
function git(command: string): string {
  try {
    return execSync(`git ${command}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const onVercel = Boolean(process.env.VERCEL);
const repo =
  process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : "DEV4N222/222-kanban";

const nextConfig: NextConfig = {
  env: {
    BUILD_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || git("rev-parse HEAD"),
    BUILD_COMMIT_MESSAGE: (process.env.VERCEL_GIT_COMMIT_MESSAGE || git("log -1 --pretty=%s")).split("\n")[0],
    BUILD_BRANCH: process.env.VERCEL_GIT_COMMIT_REF || git("rev-parse --abbrev-ref HEAD"),
    BUILD_ENV: process.env.VERCEL_ENV || "local",
    BUILD_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID || "",
    BUILD_REPO: repo,
    BUILD_UNCOMMITTED: !onVercel && git("status --porcelain") ? "true" : "",
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
