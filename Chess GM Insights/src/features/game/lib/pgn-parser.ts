import { Chess } from "chess.js";

// Fix: add from/to fields to ParsedMove for lastMove highlight
export interface ParsedMove {
  ply: number;
  san: string;
  from: string;   // e.g. "e2"
  to: string;     // e.g. "e4"
  fen: string;
  fenBefore: string;
  color: "w" | "b";
  moveNumber: number;
  clockSeconds?: number;
  timeSpentSeconds?: number;
  promotion?: string;
}

export interface PgnMetadata {
  white: string | null;
  black: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  result: string | null;
  date: string | null;
  opening: string | null;
  eco: string | null;
  event: string | null;
  timeControl: string | null;
}

export interface ParsedGame {
  metadata: PgnMetadata;
  moves: ParsedMove[];
  initialFen: string;
  totalPlies: number;
}

export function normalizePgn(pgn: string): string {
  if (!pgn) return "";

  const lines = pgn.split(/\r?\n/);
  const normalizedHeaders: string[] = [];
  const movesLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      let fixed = trimmed;
      if (!fixed.endsWith("]")) {
        if (fixed.includes('"')) {
          fixed = fixed + '"]';
        } else {
          fixed = fixed + ']';
        }
      }
      normalizedHeaders.push(fixed);
    } else {
      movesLines.push(line);
    }
  }

  let movesSection = movesLines.join(" ");

  // 1. Remove RAVs (Recursive Variation Listings) using parenthesis depth counting
  let cleanMoves = "";
  let depth = 0;
  for (let i = 0; i < movesSection.length; i++) {
    const char = movesSection[i];
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0) {
      cleanMoves += char;
    }
  }
  movesSection = cleanMoves;

  // 2. Normalize comments: Keep only [%clk ...] to prevent parsing crashes
  movesSection = movesSection.replace(/\{([^}]*)\}/g, (match, commentContent) => {
    const clkMatch = commentContent.match(/\[%clk\s+(\d+:\d+:\d+)\]/);
    if (clkMatch) {
      return `{[%clk ${clkMatch[1]}]}`;
    }
    return "";
  });

  // 3. Clean up multiple dots (e.g. 1...e5 -> 1. e5, 2..Nf6 -> 2. Nf6)
  movesSection = movesSection.replace(/\b(\d+)\s*\.{2,}\s*/g, "$1. ");

  // 4. Ensure space after move numbers (e.g. "1.e4" -> "1. e4")
  movesSection = movesSection.replace(/\b(\d+)\.\s*([a-zA-Z])/g, "$1. $2");

  // 5. Normalize promotions (e.g., e8(Q), e8/Q, e8Q -> e8=Q)
  movesSection = movesSection.replace(/\b([a-h][18])\s*[(=/]?([QRNBqrnb])\)?\b/g, "$1=$2");

  // 6. Strip Numeric Annotation Glyphs (NAGs like $1, $18)
  movesSection = movesSection.replace(/\$\d+/g, "");

  // 7. Strip out multiple consecutive spaces
  movesSection = movesSection.replace(/\s+/g, " ").trim();

  return normalizedHeaders.join("\n") + "\n\n" + movesSection;
}

export function parsePgn(pgn: string): ParsedGame | null {
  if (!pgn || pgn.length > 50000) {
    throw new Error("PGN file is too large (max 50KB). Please upload a single game.");
  }

  try {
    const normalized = normalizePgn(pgn);
    const chess = new Chess();
    chess.loadPgn(normalized);

    if (chess.history().length > 600) {
       throw new Error("Game is too long (max 600 plies).");
    }

    const header = chess.header();
    const history = chess.history({ verbose: true });

    const replayChess = new Chess();
    const fenHeader = header["FEN"];
    if (fenHeader) replayChess.load(fenHeader);

    // Fix: use /\[[^\]]*\]\s*/g to correctly strip multiline-safe headers
    const movesSection = normalized.replace(/\[[^\]]*\]\s*/g, "");
    const commentClocks = extractAllClocks(movesSection);

    const moves: ParsedMove[] = [];
    let prevClockW: number | undefined;
    let prevClockB: number | undefined;

    for (let i = 0; i < history.length; i++) {
      const m = history[i];
      const fenBefore = replayChess.fen();
      replayChess.move(m.san);
      const fenAfter = replayChess.fen();
      const color = m.color as "w" | "b";
      const clockSec = commentClocks[i];

      let timeSpent: number | undefined;
      if (clockSec !== undefined) {
        const prevClock = color === "w" ? prevClockW : prevClockB;
        if (prevClock !== undefined) timeSpent = Math.max(0, prevClock - clockSec);
        if (color === "w") prevClockW = clockSec;
        else prevClockB = clockSec;
      }

      moves.push({
        ply: i + 1,
        san: m.san,
        from: m.from,   // from chess.js verbose move
        to: m.to,       // from chess.js verbose move
        promotion: m.promotion,
        fen: fenAfter,
        fenBefore,
        color,
        moveNumber: Math.ceil((i + 1) / 2),
        clockSeconds: clockSec,
        timeSpentSeconds: timeSpent,
      });
    }

    const metadata: PgnMetadata = {
      white: header["White"] ?? null,
      black: header["Black"] ?? null,
      whiteElo: header["WhiteElo"] ? parseInt(header["WhiteElo"]) : null,
      blackElo: header["BlackElo"] ? parseInt(header["BlackElo"]) : null,
      result: header["Result"] ?? null,
      date: header["Date"]?.replace(/\?/g, "01").replace(/\./g, "-") ?? null,
      opening: header["Opening"] ?? null,
      eco: header["ECO"] ?? null,
      event: header["Event"] ?? null,
      timeControl: header["TimeControl"] ?? null,
    };

    return {
      metadata,
      moves,
      initialFen: fenHeader ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      totalPlies: history.length,
    };
  } catch (e) {
    console.error("PGN Parsing Error:", e);
    return null;
  }
}

// Fix: use /\[[^\]]*\]\s*/g — safe for brackets in header values
function extractAllClocks(movesSection: string): (number | undefined)[] {
  const results: (number | undefined)[] = [];
  const re = /\{[^}]*\[%clk\s+(\d+):(\d+):(\d+)\][^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(movesSection)) !== null) {
    results.push(parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]));
  }
  return results;
}

/** Convert SAN to UCI — Fix: use Chess import instead of require() */
export function sanToUci(san: string, fen: string): string {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    if (!move) return "";
    return move.from + move.to + (move.promotion ?? "");
  } catch {
    return "";
  }
}
