/**
 * useStockfishPlay — game loop hook for playing vs Stockfish
 * from an arbitrary starting FEN (used for "Continue after resignation").
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { playChessSound } from "@/shared/lib/sound";

export type Difficulty = "easy" | "medium" | "hard" | "adaptive";
export type PlayerColor = "white" | "black";

const DEPTH: Record<Difficulty, number> = {
  easy: 4,
  medium: 10,
  hard: 18,
  adaptive: 12, // Depth 12 is enough for adaptive skill levels
};

// Stockfish Skill Level (0-20) maps roughly to ELO 1000 - 3200
function getSkillLevel(difficulty: Difficulty, userElo?: number | null): number | undefined {
  if (difficulty === "easy") return 1;    // ~1200
  if (difficulty === "medium") return 8;  // ~2000
  if (difficulty === "hard") return 20;   // Max

  if (difficulty === "adaptive") {
    if (!userElo) return 5; // Default to ~1600 if no Elo
    // Adaptive formula: Scale ELO to Skill Level 0-20. 
    // Roughly: 1000 ELO -> Skill 0. 3000 ELO -> Skill 20.
    // We want the engine to be slightly stronger (+150 ELO) than the user.
    const targetElo = userElo + 150;
    const skill = Math.round((targetElo - 1000) / 100);
    return Math.max(0, Math.min(20, skill));
  }
  return 20;
}

const ENGINE_DELAY_MS = 450;

export interface PlayHistoryEntry {
  san: string;
  from: string;
  to: string;
  color: "w" | "b";
}

export type GameResult = "player_wins" | "engine_wins" | "draw" | null;

export interface PlayState {
  fen: string;
  history: PlayHistoryEntry[];
  isEngineThinking: boolean;
  gameResult: GameResult;
  resultReason: string;
  lastMove?: [string, string];
  evalCp: number;
  mateIn: number | null;
  turnColor: "w" | "b";
}

export function useStockfishPlay(
  initialFen: string,
  playerColor: PlayerColor,
  difficulty: Difficulty,
  userElo?: number | null,
) {
  const workerRef = useRef<Worker | null>(null);
  const chessRef = useRef(new Chess(initialFen));
  const abortRef = useRef(false);
  const engineBusyRef = useRef(false);

  const [state, setState] = useState<PlayState>({
    fen: initialFen,
    history: [],
    isEngineThinking: false,
    gameResult: null,
    resultReason: "",
    lastMove: undefined,
    evalCp: 0,
    mateIn: null,
    turnColor: chessRef.current.turn(),
  });

  useEffect(() => {
    const w = new Worker(
      new URL("@/shared/workers/stockfish.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = w;
    abortRef.current = false;

    return () => {
      abortRef.current = true;
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const checkGameOver = useCallback(
    (chess: Chess): { over: boolean; result: GameResult; reason: string } => {
      if (chess.isCheckmate()) {
        const winner = chess.turn() === "w" ? "b" : "w";
        const playerWon =
          (playerColor === "white" && winner === "w") ||
          (playerColor === "black" && winner === "b");
        return { over: true, result: playerWon ? "player_wins" : "engine_wins", reason: "Checkmate" };
      }
      if (chess.isStalemate()) return { over: true, result: "draw", reason: "Stalemate" };
      if (chess.isThreefoldRepetition()) return { over: true, result: "draw", reason: "Threefold repetition" };
      if (chess.isInsufficientMaterial()) return { over: true, result: "draw", reason: "Insufficient material" };
      if (chess.isDraw()) return { over: true, result: "draw", reason: "50-move rule" };
      return { over: false, result: null, reason: "" };
    },
    [playerColor],
  );

  const engineMove = useCallback(() => {
    const worker = workerRef.current;
    const chess = chessRef.current;
    if (!worker || abortRef.current || engineBusyRef.current) return;

    const fen = chess.fen();
    const depth = DEPTH[difficulty];
    const skillLevel = getSkillLevel(difficulty, userElo);
    const id = `play-${Date.now()}`;

    engineBusyRef.current = true;
    setState((s) => ({ ...s, isEngineThinking: true }));

    const handler = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      worker.removeEventListener("message", handler);
      engineBusyRef.current = false;
      if (abortRef.current) return;

      const bestMove: string = e.data.bestMove ?? "";
      const evalCp: number = e.data.cp ?? 0;
      const mateIn: number | null = e.data.mate ?? null;

      if (!bestMove || bestMove === "(none)") {
        setState((s) => ({ ...s, isEngineThinking: false }));
        return;
      }

      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length === 5 ? bestMove[4] : undefined;

      try {
        const move = chess.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
        const { over, result, reason } = checkGameOver(chess);

        if (move.san.includes("#")) {
          playChessSound("victory");
        } else if (move.san.includes("+")) {
          playChessSound("check");
        } else if (move.san.includes("x")) {
          playChessSound("capture");
        } else {
          playChessSound("move");
        }

        setState((s) => ({
          ...s,
          fen: chess.fen(),
          history: [...s.history, { san: move.san, from, to, color: move.color }],
          isEngineThinking: false,
          lastMove: [from, to],
          evalCp,
          mateIn,
          turnColor: chess.turn(),
          gameResult: over ? result : null,
          resultReason: over ? reason : "",
        }));
      } catch {
        setState((s) => ({ ...s, isEngineThinking: false }));
      }
    };

    worker.addEventListener("message", handler);
    worker.postMessage({ id, fen, depth, skillLevel });
  }, [difficulty, userElo, checkGameOver]);

  const makePlayerMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const chess = chessRef.current;
      if (state.isEngineThinking || state.gameResult) return false;

      const isPlayerTurn =
        (playerColor === "white" && chess.turn() === "w") ||
        (playerColor === "black" && chess.turn() === "b");
      if (!isPlayerTurn) return false;

      try {
        const move = chess.move({ from, to, promotion: (promotion ?? "q") as "q" | "r" | "b" | "n" });
        const { over, result, reason } = checkGameOver(chess);

        if (move.san.includes("#")) {
          playChessSound("victory");
        } else if (move.san.includes("+")) {
          playChessSound("check");
        } else if (move.san.includes("x")) {
          playChessSound("capture");
        } else {
          playChessSound("move");
        }

        setState((s) => ({
          ...s,
          fen: chess.fen(),
          history: [...s.history, { san: move.san, from, to, color: move.color }],
          lastMove: [from, to],
          turnColor: chess.turn(),
          gameResult: over ? result : null,
          resultReason: over ? reason : "",
        }));
        if (!over) setTimeout(() => engineMove(), ENGINE_DELAY_MS);
        return true;
      } catch {
        return false;
      }
    },
    [state.isEngineThinking, state.gameResult, playerColor, checkGameOver, engineMove],
  );

  const resign = useCallback(() => {
    abortRef.current = true;
    setState((s) => ({ ...s, isEngineThinking: false, gameResult: "engine_wins", resultReason: "You resigned" }));
  }, []);

  useEffect(() => {
    const chess = chessRef.current;
    const isEngineFirst =
      (playerColor === "white" && chess.turn() === "b") ||
      (playerColor === "black" && chess.turn() === "w");
    if (isEngineFirst) setTimeout(() => engineMove(), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, makePlayerMove, resign };
}
