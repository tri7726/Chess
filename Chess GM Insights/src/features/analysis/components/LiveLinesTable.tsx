import type { MultiPVLine } from "@/shared/workers/stockfish.worker";
import { Loader2 } from "lucide-react";

interface LiveLinesTableProps {
  lines: MultiPVLine[];
  isThinking: boolean;
  enabled: boolean;
}

export function LiveLinesTable({ lines, isThinking, enabled }: LiveLinesTableProps) {
  if (!enabled) return null;

  // Format evaluation score
  const formatEval = (line: MultiPVLine) => {
    if (line.mate !== null) {
      return `M${Math.abs(line.mate)}`;
    }
    const score = line.cp / 100;
    const sign = score > 0 ? "+" : "";
    return `${sign}${score.toFixed(2)}`;
  };

  // Color mapping for MultiPV lines
  const rankColors = {
    1: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" },
    2: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
    3: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          🎯 Candidate Lines (Multi-PV)
        </h3>
        {isThinking && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Stockfish is calculating...
          </span>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
          Waiting for engine evaluation...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-medium">
                <th className="py-2 pl-1 w-12 text-center">Rank</th>
                <th className="py-2 w-20">Move</th>
                <th className="py-2 w-20 text-center">Eval</th>
                <th className="py-2 pl-3">Continuation Line</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {lines.map((line) => {
                const color = rankColors[line.multipv as 1 | 2 | 3] || rankColors[1];
                return (
                  <tr key={line.multipv} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pl-1 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${color.bg} ${color.text} border ${color.border}`}>
                        {line.multipv}
                      </span>
                    </td>
                    <td className="py-2.5 font-sans font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                        {line.bestMove.slice(0, 2)}-{line.bestMove.slice(2, 4)}
                      </span>
                    </td>
                    <td className={`py-2.5 text-center font-bold ${color.text}`}>
                      {formatEval(line)}
                    </td>
                    <td className="py-2.5 pl-3 text-muted-foreground/80 font-sans truncate max-w-[200px] md:max-w-[400px]">
                      {line.pv.slice(0, 5).join(" ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
