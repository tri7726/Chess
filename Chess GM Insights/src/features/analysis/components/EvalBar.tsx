import { useMemo } from "react";

interface EvalBarProps {
  /** Centipawn evaluation (e.g. +120, -50). Clamped typically between -1500 and 1500 */
  cp?: number;
  /** Mate in X moves. Positive for white mate, negative for black mate */
  mate?: number | null;
  /** Active side: "w" | "b" */
  turn?: "w" | "b";
  /** Board orientation: "white" | "black" */
  orientation?: "white" | "black";
  /** Whether the engine is currently calculating */
  isAnalyzing?: boolean;
}

/** Win probability from centipawns (logistic curve calibrated to Lichess data) */
function winProb(cp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

export function EvalBar({
  cp = 0,
  mate = null,
  turn = "w",
  orientation = "white",
  isAnalyzing = false,
}: EvalBarProps) {
  // Determine percentage for white
  const whitePercentage = useMemo(() => {
    if (mate !== null) {
      return mate > 0 ? 100 : 0;
    }
    // Convert centipawns to win probability
    const wp = winProb(cp);
    // Convert probability to percentage (0 - 100)
    return Math.max(5, Math.min(95, wp * 100));
  }, [cp, mate]);

  // Height of White's share of the bar
  const whiteHeight = orientation === "white" ? whitePercentage : 100 - whitePercentage;

  // Text label to display
  const label = useMemo(() => {
    if (mate !== null) {
      return mate < 0 ? `-M${Math.abs(mate)}` : `M${mate}`;
    }
    const scoreVal = cp / 100;
    const clampedScore = Math.max(-99.0, Math.min(99.0, scoreVal));
    const sign = clampedScore > 0 ? "+" : "";
    return `${sign}${clampedScore.toFixed(1)}`;
  }, [cp, mate]);

  // Position of the text: put it in the dominant side of the bar
  const isWhiteDominant = whitePercentage > 50;
  // If orientation is white, White is on top (height represents white's percentage, but standard top-aligned means we define black's height from top or white's height from bottom)
  // Let's make it simple: We use flex-col. White is top, Black is bottom if orientation is black; or vice versa.
  // Actually, standard Lichess eval bar:
  // White is on TOP if orientation is black? No. White is on top if orientation is white, Black is on bottom.
  // Let's check: in chess, White pieces start on rank 1-2 (bottom). So if orientation is white, White is at the bottom of the board, but standard eval bar shows White on TOP of the bar?
  // Let's verify: on chess.com / lichess, White's evaluation is at the top of the vertical bar if White is playing (facing white side), wait, actually:
  // Lichess eval bar: Black is on top, White is on bottom! Yes! The bottom of the board is White, so the bottom of the eval bar is White. The top of the board is Black, so the top of the eval bar is Black.
  // So:
  // - Orientation is "white": White is on BOTTOM, Black is on TOP.
  // - Orientation is "black": White is on TOP, Black is on BOTTOM.
  // Let's implement this!

  const topColor = orientation === "white" ? "bg-zinc-800" : "bg-zinc-100";
  const bottomColor = orientation === "white" ? "bg-zinc-100" : "bg-zinc-800";

  // Height of top portion = 100 - whitePercentage if orientation is white (since White is bottom, Black is top)
  const topHeight = orientation === "white" ? 100 - whitePercentage : whitePercentage;

  // Label text color: dark text on light background, light text on dark background
  const labelColor = isWhiteDominant
    ? "text-zinc-900 font-bold"
    : "text-zinc-100 font-semibold";

  return (
    <div className="eval-bar-vertical select-none">
      {/* Top portion (Black if orientation is white) */}
      <div
        className={`${topColor} w-full transition-all duration-500 ease-out`}
        style={{ height: `${topHeight}%` }}
      />
      {/* Bottom portion (White if orientation is white) */}
      <div
        className={`${bottomColor} w-full transition-all duration-500 ease-out flex-1`}
      />

      {/* Absolute overlay for score label */}
      <div
        className={`absolute inset-x-0 text-center pointer-events-none font-mono font-bold tracking-tighter ${labelColor}`}
        style={{
          fontSize: label.length > 4 ? "8px" : "9px",
          transform: label.length > 4 ? "scale(0.9)" : "none",
          transformOrigin: "center",
          // Position label in the middle of the dominant side
          ...(isWhiteDominant
            ? (orientation === "white" ? { bottom: "12px" } : { top: "12px" })
            : (orientation === "white" ? { top: "12px" } : { bottom: "12px" })),
        }}
      >
        {isAnalyzing && label === "+0.0" ? "..." : label}
      </div>
    </div>
  );
}
