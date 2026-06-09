/**
 * Syzygy tablebase lookup via the free Lichess API.
 * Works for positions with ≤7 pieces (including kings).
 * No API key required.
 *
 * Docs: https://lichess.org/api#tag/Tablebase
 */

export type SyzygyOutcome = "win" | "loss" | "draw" | "cursed-win" | "blessed-loss" | "unknown";

export interface SyzygyResult {
  category: SyzygyOutcome;
  /** DTZ = Distance To Zeroing (pawn move or capture). Null if unknown. */
  dtz: number | null;
  /** DTM = Distance To Mate. Null for draw/unknown. */
  dtm: number | null;
  bestMove: string | null;
  /** Human-readable verdict */
  verdict: string;
}

/** Count pieces in a FEN position (excludes empty squares and separators) */
function countPieces(fen: string): number {
  const position = fen.split(" ")[0];
  return [...position].filter((c) => /[a-zA-Z]/.test(c) && c !== "/").length;
}

const CACHE = new Map<string, SyzygyResult>();

function verdictFromCategory(category: SyzygyOutcome, dtz: number | null): string {
  switch (category) {
    case "win":          return `Winning — DTZ ${dtz ?? "?"}`;
    case "loss":         return `Losing — DTZ ${dtz ?? "?"}`;
    case "draw":         return "Theoretical draw";
    case "cursed-win":   return "Win in theory, but draw under 50-move rule";
    case "blessed-loss": return "Loss in theory, but draw under 50-move rule";
    default:             return "Unknown result";
  }
}

/**
 * Query Lichess Syzygy tablebase.
 * Returns null if position has >7 pieces (not covered by tablebases).
 */
export async function querySyzygy(fen: string): Promise<SyzygyResult | null> {
  if (countPieces(fen) > 7) return null;

  if (CACHE.has(fen)) return CACHE.get(fen)!;

  try {
    const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();

    // The API returns `category` at root level + `moves` array for best line
    const category: SyzygyOutcome = data.category ?? "unknown";
    const dtz: number | null = data.dtz ?? null;
    const dtm: number | null = data.dtm ?? null;
    const bestMove: string | null = data.moves?.[0]?.uci ?? null;

    const result: SyzygyResult = {
      category,
      dtz,
      dtm,
      bestMove,
      verdict: verdictFromCategory(category, dtz),
    };

    CACHE.set(fen, result);
    return result;
  } catch (e) {
    console.warn("[Syzygy] Lookup failed:", e);
    return {
      category: "unknown",
      dtz: null,
      dtm: null,
      bestMove: null,
      verdict: "Tablebase unavailable",
    };
  }
}
