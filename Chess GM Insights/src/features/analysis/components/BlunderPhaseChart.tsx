import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { BrainCircuit, Info } from "lucide-react";

interface BlunderPhaseChartProps {
  /** List of mistakes with ply numbers */
  mistakes: { ply: number; label: string }[];
}

const COLORS = {
  Opening: "oklch(0.7 0.15 140)",   // Emerald Green
  Middlegame: "oklch(0.7 0.15 50)",  // Amber Gold
  Endgame: "oklch(0.6 0.2 25)",      // Crimson Red
};

export function BlunderPhaseChart({ mistakes }: BlunderPhaseChartProps) {
  const data = useMemo(() => {
    let opening = 0;
    let middlegame = 0;
    let endgame = 0;

    mistakes.forEach((m) => {
      // 1 move = 2 plies.
      // Opening: moves 1-12 (plies 1-24)
      // Middlegame: moves 13-40 (plies 25-80)
      // Endgame: moves 41+ (ply 81+)
      if (m.ply <= 24) opening++;
      else if (m.ply <= 80) middlegame++;
      else endgame++;
    });

    return [
      { name: "Opening", value: opening, fill: COLORS.Opening },
      { name: "Middlegame", value: middlegame, fill: COLORS.Middlegame },
      { name: "Endgame", value: endgame, fill: COLORS.Endgame },
    ].filter((d) => d.value > 0);
  }, [mistakes]);

  const coachAdvice = useMemo(() => {
    if (mistakes.length === 0) {
      return {
        title: "Masterful Precision",
        text: "You didn't make any major mistakes or blunders in this set of positions. Keep maintaining this excellent standard of play!",
      };
    }

    let opening = 0;
    let middlegame = 0;
    let endgame = 0;

    mistakes.forEach((m) => {
      if (m.ply <= 24) opening++;
      else if (m.ply <= 80) middlegame++;
      else endgame++;
    });

    const max = Math.max(opening, middlegame, endgame);

    if (max === opening) {
      return {
        title: "Khai Cuộc (Opening) Weakness",
        text: "A high ratio of your mistakes happen in the first 12 moves. We suggest studying opening principles (center control, rapid development) or memorizing specific ECO theory lines.",
      };
    } else if (max === middlegame) {
      return {
        title: "Trung Cuộc (Middlegame) Weakness",
        text: "You are struggling in the middlegame. This is typically caused by missed tactical motifs. Try focusing on the Training tab to solve pins, forks, and skewers to build board vision.",
      };
    } else {
      return {
        title: "Tàn Cuộc (Endgame) Weakness",
        text: "Your late-game accuracy drops. Endgame errors are often fatal. Study key endgame techniques: King safety, opposition, and passed pawn promotion paths.",
      };
    }
  }, [mistakes]);

  if (mistakes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs text-muted-foreground italic text-center">
        No mistakes detected to analyze. Perfect play!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        <BrainCircuit className="h-4 w-4 text-primary" />
        <span>Blunder Phase Distribution</span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Pie Chart */}
        <div className="h-32 w-full md:w-1/2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={22}
                outerRadius={42}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "oklch(0.245 0.04 285)",
                  border: "1px solid oklch(0.32 0.03 285)",
                  borderRadius: 6,
                  fontSize: 10,
                }}
              />
              <Legend
                verticalAlign="middle"
                layout="vertical"
                align="right"
                iconSize={8}
                wrapperStyle={{ fontSize: 9 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* AI Coach Card */}
        <div className="flex-1 bg-muted/20 border border-border/60 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
            <Info className="h-3 w-3 text-primary" />
            <span>{coachAdvice.title}</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal">
            {coachAdvice.text}
          </p>
        </div>
      </div>
    </div>
  );
}
