/**
 * SyzygyBadge — inline component that shows tablebase result
 * for the current board position when ≤7 pieces remain.
 */
import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { querySyzygy } from "@/features/analysis/lib/syzygy";
import type { SyzygyResult } from "@/features/analysis/lib/syzygy";
import { Database, Loader2 } from "lucide-react";

function countPieces(fen: string): number {
  const position = fen.split(" ")[0];
  return [...position].filter((c) => /[a-zA-Z]/.test(c) && c !== "/").length;
}

const OUTCOME_COLOR: Record<string, string> = {
  win:           "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  loss:          "border-red-500/40 bg-red-500/10 text-red-300",
  draw:          "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  "cursed-win":  "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  "blessed-loss":"border-orange-500/40 bg-orange-500/10 text-orange-300",
  unknown:       "border-zinc-700 bg-zinc-800/50 text-zinc-400",
};

const OUTCOME_ICON: Record<string, string> = {
  win: "♔ Win",
  loss: "♚ Loss",
  draw: "½ Draw",
  "cursed-win": "⚠ Cursed Win",
  "blessed-loss": "⚠ Blessed Loss",
  unknown: "? Unknown",
};

interface SyzygyBadgeProps {
  fen: string;
}

export function SyzygyBadge({ fen }: SyzygyBadgeProps) {
  const [result, setResult] = useState<SyzygyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const pieces = countPieces(fen);

  useEffect(() => {
    if (pieces > 7) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    querySyzygy(fen).then((r) => {
      if (!cancelled) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [fen, pieces]);

  // Don't render anything if not an endgame position
  if (pieces > 7) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2">
      <Database className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-xs font-medium text-muted-foreground">Syzygy ({pieces} pieces)</span>

      {loading && (
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Looking up…
        </span>
      )}

      {!loading && result && (
        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${OUTCOME_COLOR[result.category] ?? OUTCOME_COLOR.unknown}`}
          >
            {OUTCOME_ICON[result.category] ?? "?"}
          </Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {result.verdict}
          </span>
        </div>
      )}
    </div>
  );
}
