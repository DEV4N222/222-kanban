"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDays, type CadencePoint } from "@/lib/analytics/cadence";
import { Timer, TrendingDown, TrendingUp } from "lucide-react";

export function CadenceChart({ points, selectedSprintId }: { points: CadencePoint[]; selectedSprintId: string }) {
  const index = points.findIndex((p) => p.sprintId === selectedSprintId);
  const selected = points[index];
  const previous = points
    .slice(0, Math.max(0, index))
    .reverse()
    .find((p) => p.averageDays !== null);

  const change =
    selected?.averageDays != null && previous?.averageDays != null
      ? Math.round((selected.averageDays - previous.averageDays) * 10) / 10
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Timer className="size-5 shrink-0 text-muted-foreground" />
          {selected?.averageDays != null ? (
            <p className="text-sm">
              <span className="text-lg font-semibold">{formatDays(selected.averageDays)}</span>
              <span className="text-muted-foreground">
                {" "}
                on average in {selected.sprint}, across {selected.completed}{" "}
                {selected.completed === 1 ? "card" : "cards"}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No cards completed in {selected?.sprint ?? "this sprint"} yet.
            </p>
          )}
        </div>
        {change !== null && previous && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {change <= 0 ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
            {change === 0
              ? `Same pace as ${previous.sprint}`
              : `${formatDays(Math.abs(change))} ${change < 0 ? "faster" : "slower"} than ${previous.sprint}`}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={points} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="sprint"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals
            unit="d"
            width={40}
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
            formatter={(value, _name, item) => {
              const point = item.payload as CadencePoint;
              return point.averageDays === null
                ? ["No cards completed", "Average"]
                : [`${formatDays(point.averageDays)} · ${point.completed} ${point.completed === 1 ? "card" : "cards"}`, "Average"];
            }}
          />
          <Bar dataKey="averageDays" name="Average days" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            {points.map((p) => (
              <Cell
                key={p.sprintId}
                fill={p.sprintId === selectedSprintId ? "var(--chart-1)" : "var(--muted-foreground)"}
                fillOpacity={p.sprintId === selectedSprintId ? 1 : 0.35}
              />
            ))}
            <LabelList
              dataKey="averageDays"
              position="top"
              formatter={(value) => (typeof value === "number" ? `${value}d` : "")}
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">
        Time from a card being added to the sprint until it reaches a Done column. Highlighted: the
        selected sprint.
      </p>
    </div>
  );
}
