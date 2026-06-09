import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import type { MoveEval } from "@/features/analysis/lib/move-labels";
import type { ParsedMove } from "@/features/game/lib/pgn-parser";

const LABEL_COLOR: Record<string, string> = {
  brilliant:  "bg-violet-500/20 text-violet-300 border-violet-500/40",
  great:      "bg-violet-500/15 text-violet-200 border-violet-500/30",
  best:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  excellent:  "bg-sky-500/15 text-sky-300 border-sky-500/40",
  good:       "bg-teal-500/15 text-teal-300 border-teal-500/40",
  okay:       "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  inaccuracy: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  mistake:    "bg-orange-500/15 text-orange-300 border-orange-500/40",
  blunder:    "bg-red-500/20 text-red-300 border-red-500/40",
  theory:     "bg-blue-500/15 text-blue-300 border-blue-500/40",
};

const LABEL_ICON: Record<string, string> = {
  brilliant: "⭐⭐", great: "⭐!", best: "⭐", excellent: "👍",
  good: "✓", okay: "👌", inaccuracy: "🤔", mistake: "❓", blunder: "❌", theory: "📖",
};

interface MovesListProps {
  moves: ParsedMove[];
  evals: MoveEval[];
  currentPly: number;
  onPlyClick: (ply: number) => void;
}

function MoveCell({
  san, label, ply, isActive, onClick,
}: {
  san: string;
  label?: string;
  ply: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm font-mono transition-colors hover:bg-accent ${
        isActive ? "bg-primary/20 ring-1 ring-primary/40" : ""
      }`}
    >
      <span>{san}</span>
      {label && (
        <Badge
          variant="outline"
          className={`shrink-0 border text-[10px] ${LABEL_COLOR[label] ?? ""}`}
        >
          {LABEL_ICON[label] ?? label}
        </Badge>
      )}
    </button>
  );
}

export function MovesList({ moves, evals, currentPly, onPlyClick }: MovesListProps) {
  const pairs: { n: number; white?: ParsedMove; black?: ParsedMove }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      n: moves[i].moveNumber,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const evalMap = new Map<number, MoveEval>(evals.map((e) => [e.ply, e]));

  if (moves.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No moves yet — analyze a game first.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[420px] rounded-lg border border-border bg-card p-2">
      <div className="space-y-0.5">
        {pairs.map((pair) => (
          <div key={pair.n} className="grid grid-cols-[28px_1fr_1fr] items-center gap-1">
            <span className="text-xs text-muted-foreground tabular-nums">{pair.n}.</span>

            {pair.white ? (
              <MoveCell
                san={pair.white.san}
                label={evalMap.get(pair.white.ply)?.label}
                ply={pair.white.ply}
                isActive={currentPly === pair.white.ply}
                onClick={() => onPlyClick(pair.white!.ply)}
              />
            ) : (
              <span />
            )}

            {pair.black ? (
              <MoveCell
                san={pair.black.san}
                label={evalMap.get(pair.black.ply)?.label}
                ply={pair.black.ply}
                isActive={currentPly === pair.black.ply}
                onClick={() => onPlyClick(pair.black!.ply)}
              />
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
