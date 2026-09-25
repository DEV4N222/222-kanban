import type { RaidItemRow, RaidLevel, RaidStatus, RaidType } from "@/lib/types";

export const RAID_TYPES: { value: RaidType; label: string; plural: string; prefix: string; actionLabel: string }[] = [
  { value: "risk", label: "Risk", plural: "Risks", prefix: "R", actionLabel: "Mitigation" },
  { value: "assumption", label: "Assumption", plural: "Assumptions", prefix: "A", actionLabel: "How it will be validated" },
  { value: "issue", label: "Issue", plural: "Issues", prefix: "I", actionLabel: "Resolution / next action" },
  { value: "decision", label: "Decision", plural: "Decisions", prefix: "D", actionLabel: "Rationale" },
];

export const RAID_STATUSES: { value: RaidStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
];

export const RAID_LEVELS: { value: RaidLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function raidTypeMeta(type: RaidType) {
  return RAID_TYPES.find((t) => t.value === type)!;
}

export function raidRef(item: Pick<RaidItemRow, "type" | "number">) {
  return `${raidTypeMeta(item.type).prefix}-${item.number}`;
}

const SCORE: Record<RaidLevel, number> = { low: 1, medium: 2, high: 3 };

// Risks are rated impact × likelihood (1–9); everything else by impact alone.
export function raidRating(item: Pick<RaidItemRow, "type" | "impact" | "likelihood">): RaidLevel | null {
  if (!item.impact) return null;
  if (item.type !== "risk" || !item.likelihood) return item.impact;
  const score = SCORE[item.impact] * SCORE[item.likelihood];
  return score >= 6 ? "high" : score >= 3 ? "medium" : "low";
}
