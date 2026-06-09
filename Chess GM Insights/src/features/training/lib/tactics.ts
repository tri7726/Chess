import { Chess } from "chess.js";
import type { ParsedMove } from "@/features/game/lib/pgn-parser";
import type { MoveEval } from "@/features/analysis/lib/move-labels";
import { addCard } from "./sm2";
import type { SM2Card } from "./sm2";

export interface TacticOccurrence {
  ply: number;
  type: "fork" | "pin" | "skewer" | "discovered_attack";
  color: "w" | "b";
  description: string;
}

export interface PawnStructureReport {
  doubledPawnsW: number;
  doubledPawnsB: number;
  isolatedPawnsW: number;
  isolatedPawnsB: number;
  passedPawnsW: number;
  passedPawnsB: number;
  pawnIslandsW: number;
  pawnIslandsB: number;
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function analyzePawnStructure(fen: string): PawnStructureReport {
  const chess = new Chess(fen);
  const board = chess.board();

  const wFiles: number[] = [];
  const bFiles: number[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq?.type === "p") (sq.color === "w" ? wFiles : bFiles).push(f);
    }
  }

  return {
    doubledPawnsW: countDoubled(wFiles),
    doubledPawnsB: countDoubled(bFiles),
    isolatedPawnsW: countIsolated(wFiles),
    isolatedPawnsB: countIsolated(bFiles),
    passedPawnsW: countPassed(chess, "w"),
    passedPawnsB: countPassed(chess, "b"),
    pawnIslandsW: countIslands(wFiles),
    pawnIslandsB: countIslands(bFiles),
  };
}

function countDoubled(files: number[]): number {
  const cnt = new Array(8).fill(0);
  for (const f of files) cnt[f]++;
  return cnt.reduce((acc, c) => acc + Math.max(0, c - 1), 0);
}

function countIsolated(files: number[]): number {
  const s = new Set(files);
  return files.filter((f) => !s.has(f - 1) && !s.has(f + 1)).length;
}

function countIslands(files: number[]): number {
  if (files.length === 0) return 0;
  const sorted = [...new Set(files)].sort((a, b) => a - b);
  return sorted.reduce((acc, f, i) => acc + (i > 0 && sorted[i - 1] < f - 1 ? 1 : 0), 1);
}

function countPassed(chess: Chess, color: "w" | "b"): number {
  const board = chess.board();
  const opp = color === "w" ? "b" : "w";
  const dir = color === "w" ? -1 : 1;
  let count = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq?.type !== "p" || sq.color !== color) continue;
      let passed = true;
      let row = r + dir;
      outer: while (row >= 0 && row < 8) {
        for (const df of [-1, 0, 1]) {
          const nf = f + df;
          if (nf >= 0 && nf < 8 && board[row][nf]?.type === "p" && board[row][nf]?.color === opp) {
            passed = false;
            break outer;
          }
        }
        row += dir;
      }
      if (passed) count++;
    }
  }
  return count;
}

/** Detect Fork, Pin, Skewer, Discovered Attack after each move */
export function detectTactics(moves: ParsedMove[]): TacticOccurrence[] {
  const tactics: TacticOccurrence[] = [];

  for (const move of moves) {
    const chess = new Chess(move.fen); // position AFTER the move
    const attacker = move.color;
    const victim = attacker === "w" ? "b" : "w";

    // Fork: the piece that just moved attacks 2+ valuable opponent pieces
    const fork = detectForkAfterMove(chess, move.to, victim);
    if (fork) {
      tactics.push({ ply: move.ply, type: "fork", color: attacker, description: `Fork with ${move.san} — attacks ${fork}` });
    }

    // Pin: any opponent piece is now pinned to their king
    const pin = detectPinAfterMove(chess, victim);
    if (pin) {
      tactics.push({ ply: move.ply, type: "pin", color: attacker, description: `Pin created by ${move.san}` });
    }

    // Skewer: a high-value opponent piece is attacked; behind it is another piece
    const skewer = detectSkewerAfterMove(chess, move.to, attacker, victim);
    if (skewer) {
      tactics.push({ ply: move.ply, type: "skewer", color: attacker, description: `Skewer with ${move.san} — ${skewer}` });
    }

    // Discovered attack: non-capture move that puts opponent in check
    if (!move.san.includes("x") && chess.inCheck()) {
      tactics.push({ ply: move.ply, type: "discovered_attack", color: attacker, description: `Discovered check with ${move.san}` });
    }
  }

  return tactics;
}

/** Fork: the moved piece (on toSquare) attacks 2+ valuable opponent pieces */
function detectForkAfterMove(
  chess: Chess,
  toSquare: string,
  victim: "w" | "b",
): string | null {
  const allMoves = chess.moves({ verbose: true, square: toSquare as any });
  const attacked = allMoves
    .filter((m) => {
      const target = chess.get(m.to as any);
      return target && target.color === victim && PIECE_VALUES[target.type] >= 3;
    })
    .map((m) => {
      const target = chess.get(m.to as any);
      return target?.type.toUpperCase() ?? "?";
    });

  return attacked.length >= 2 ? attacked.join(" & ") : null;
}

/** Pin: remove each opponent piece — if their king is exposed, it's pinned */
function detectPinAfterMove(chess: Chess, pinnedColor: "w" | "b"): boolean {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq || sq.color !== pinnedColor || sq.type === "k") continue;

      const squareName = `${"abcdefgh"[f]}${8 - r}` as any;
      try {
        const tempChess = new Chess(chess.fen());
        tempChess.remove(squareName);
        const fenParts = tempChess.fen().split(" ");
        fenParts[1] = pinnedColor;
        const testChess = new Chess(fenParts.join(" "));
        if (testChess.inCheck()) return true;
      } catch {
        // ignore invalid positions
      }
    }
  }
  return false;
}

/**
 * Skewer: a sliding piece (B/R/Q) on toSquare attacks a HIGH-value opponent
 * piece (K or Q). If that piece moves, a LOWER-value piece behind it is exposed.
 * Opposite of a pin — the front piece is too valuable to ignore.
 */
function detectSkewerAfterMove(
  chess: Chess,
  toSquare: string,
  attackerColor: "w" | "b",
  victimColor: "w" | "b",
): string | null {
  const movingPiece = chess.get(toSquare as any);
  // Only sliding pieces can skewer
  if (!movingPiece || !"brq".includes(movingPiece.type)) return null;

  const board = chess.board();
  const file = toSquare.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(toSquare[1]) - 1;   // 1=0..8=7

  // Ray directions depending on piece type
  const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ORTHO = [[0,1],[0,-1],[1,0],[-1,0]];
  const dirs = movingPiece.type === "b"
    ? DIAG
    : movingPiece.type === "r"
      ? ORTHO
      : [...DIAG, ...ORTHO];

  for (const [dr, df] of dirs) {
    let r = rank + dr;
    let f = file + df;
    let frontPiece: { type: string; color: string } | null = null;
    let frontSq = "";

    while (r >= 0 && r < 8 && f >= 0 && f < 8) {
      // board[row][col]: row 0 = rank 8, row 7 = rank 1
      const sq = board[7 - r][f];
      const sqName = `${"abcdefgh"[f]}${r + 1}`;

      if (sq) {
        if (!frontPiece) {
          // First piece in ray — must be a HIGH-value victim (K or Q)
          if (sq.color === victimColor && (sq.type === "k" || sq.type === "q")) {
            frontPiece = sq;
            frontSq = sqName;
          } else {
            break; // blocked by other piece — not a skewer
          }
        } else {
          // Second piece — any opponent piece behind the high-value front piece
          if (sq.color === victimColor && PIECE_VALUES[sq.type] < PIECE_VALUES[frontPiece.type]) {
            return `${frontPiece.type.toUpperCase()} on ${frontSq} skewered, exposing ${sq.type.toUpperCase()}`;
          }
          break;
        }
      }
      r += dr;
      f += df;
    }
  }
  return null;
}

/** Auto-generate SM-2 puzzle cards from blunders/mistakes */
export function generatePuzzlesFromGame(
  moves: ParsedMove[],
  evals: MoveEval[],
  gameHash: string,
): SM2Card[] {
  const created: SM2Card[] = [];
  for (const ev of evals) {
    if (ev.label !== "blunder" && ev.label !== "mistake") continue;
    const move = moves.find((m) => m.ply === ev.ply);
    if (!move) continue;

    const card = addCard({
      id: `${gameHash}-ply${ev.ply}`,
      gameHash,
      fen: move.fenBefore,
      solution: [ev.bestMove],
      theme: ev.label === "blunder" ? "blunder_recovery" : "mistake_fix",
    });
    created.push(card);
  }
  return created;
}
