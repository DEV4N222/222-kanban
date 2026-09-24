"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LeaderboardEntry } from "@/lib/analytics/leaderboard";
import { Trophy } from "lucide-react";

const ROW_HEIGHT = 40;

export function GamificationChart({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries[0];
  const tied = entries.filter((e) => e.completed === top.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Trophy className="size-5 shrink-0 text-amber-500" />
        <p className="text-sm">
          <span className="font-semibold">{tied.map((e) => e.name).join(" & ")}</span>
          <span className="text-muted-foreground">
            {tied.length > 1 ? " are tied for the lead with " : " leads the sprint with "}
            {top.completed} {top.completed === 1 ? "card" : "cards"} completed
          </span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={entries.length * ROW_HEIGHT + 16}>
        <BarChart
          data={entries}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              backgroundColor: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(value) => [value, "Cards completed"]}
          />
          <Bar
            dataKey="completed"
            name="Cards completed"
            fill="var(--chart-1)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="completed"
              position="right"
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
