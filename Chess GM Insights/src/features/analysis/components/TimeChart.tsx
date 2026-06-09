import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

export function TimeChart({ data }: { data?: { move: number; time: number; color: "w" | "b" }[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-32 w-full rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex justify-between items-center text-xs font-medium text-muted-foreground">
        <span>Time Spent (Seconds)</span>
        <span className="flex items-center gap-1.5 text-[10px]">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full" /> Move under 4s (rush)
        </span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="move" stroke="oklch(0.7 0.02 285)" fontSize={10} />
          <YAxis stroke="oklch(0.7 0.02 285)" fontSize={10} />
          <Tooltip
            contentStyle={{
              background: "oklch(0.245 0.04 285)",
              border: "1px solid oklch(0.32 0.03 285)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(val: number) => [`${val}s`, "Time Spent"]}
          />
          <Bar dataKey="time">
            {data.map((entry, index) => {
              const isRush = entry.time < 4;
              let fill = entry.color === "w" ? "oklch(0.9 0.02 285)" : "oklch(0.4 0.02 285)";
              if (isRush) {
                fill = "oklch(0.62 0.23 25)"; // destructive red
              }
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

