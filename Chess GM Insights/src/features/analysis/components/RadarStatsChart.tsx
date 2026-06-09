import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ShieldAlert } from "lucide-react";
import type { MoveEval, LabelCounts } from "@/features/analysis/lib/move-labels";

interface RadarStatsChartProps {
  evals: MoveEval[];
  accW: number | null;
  accB: number | null;
  countsW: LabelCounts;
  countsB: LabelCounts;
  whiteName?: string;
  blackName?: string;
}

export function RadarStatsChart({
  evals,
  accW,
  accB,
  countsW,
  countsB,
  whiteName = "White",
  blackName = "Black",
}: RadarStatsChartProps) {
  const data = useMemo(() => {
    if (!evals.length || accW === null || accB === null) return [];

    let openingW = 0, openingWTotal = 0;
    let openingB = 0, openingBTotal = 0;
    let endgameW = 0, endgameWTotal = 0;
    let endgameB = 0, endgameBTotal = 0;

    evals.forEach((e) => {
      // Opening: first 24 plies (12 moves)
      // Endgame: > 80 plies (40 moves)
      if (e.ply <= 24) {
        if (e.color === "w") { openingW += e.accuracy; openingWTotal++; }
        else { openingB += e.accuracy; openingBTotal++; }
      }
      if (e.ply >= 80) {
        if (e.color === "w") { endgameW += e.accuracy; endgameWTotal++; }
        else { endgameB += e.accuracy; endgameBTotal++; }
      }
    });

    const opW = openingWTotal > 0 ? openingW / openingWTotal : accW;
    const opB = openingBTotal > 0 ? openingB / openingBTotal : accB;
    const egW = endgameWTotal > 0 ? endgameW / endgameWTotal : accW;
    const egB = endgameBTotal > 0 ? endgameB / endgameBTotal : accB;

    // Attack Metric: Punishes passive play, rewards brilliant/great/best moves
    const attW = Math.max(10, Math.min(100, accW + (countsW.brilliant * 6) + (countsW.great * 3) + (countsW.best * 0.5)));
    const attB = Math.max(10, Math.min(100, accB + (countsB.brilliant * 6) + (countsB.great * 3) + (countsB.best * 0.5)));

    // Defense Metric: Penalizes blunders/mistakes aggressively
    const defW = Math.max(10, Math.min(100, accW - (countsW.blunder * 8) - (countsW.mistake * 4)));
    const defB = Math.max(10, Math.min(100, accB - (countsB.blunder * 8) - (countsB.mistake * 4)));

    return [
      { subject: "Accuracy", white: Math.round(accW), black: Math.round(accB) },
      { subject: "Attack", white: Math.round(attW), black: Math.round(attB) },
      { subject: "Defense", white: Math.round(defW), black: Math.round(defB) },
      { subject: "Endgame", white: Math.round(egW), black: Math.round(egB) },
      { subject: "Opening", white: Math.round(opW), black: Math.round(opB) },
    ];
  }, [evals, accW, accB, countsW, countsB]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col h-full min-h-[250px]">
      <div className="flex items-center gap-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <span>Performance Radar</span>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            <PolarGrid stroke="oklch(0.32 0.03 285)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.7 0.02 285)", fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.245 0.04 285)",
                border: "1px solid oklch(0.32 0.03 285)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
            <Radar
              name={whiteName}
              dataKey="white"
              stroke="oklch(0.95 0.01 285)"
              fill="oklch(0.95 0.01 285)"
              fillOpacity={0.4}
            />
            <Radar
              name={blackName}
              dataKey="black"
              stroke="oklch(0.553 0.243 297)"
              fill="oklch(0.553 0.243 297)"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
