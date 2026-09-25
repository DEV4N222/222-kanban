import type { RetroKind } from "@/lib/types";

export const RETRO_COLUMNS: { kind: RetroKind; title: string; prompt: string }[] = [
  { kind: "keep", title: "Keep doing", prompt: "What worked well that we should keep?" },
  { kind: "stop", title: "Stop doing", prompt: "What slowed us down or didn't help?" },
  { kind: "start", title: "Start doing", prompt: "What should we try next sprint?" },
  { kind: "celebrate", title: "Celebrate", prompt: "Wins, shout-outs and moments worth marking." },
];

export function retroColumnTitle(kind: RetroKind): string {
  return RETRO_COLUMNS.find((c) => c.kind === kind)?.title ?? kind;
}
