import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { ParsedGame } from "@/features/game/lib/pgn-parser";
import { sanToUci } from "@/features/game/lib/pgn-parser";
import { classifyMove, aggregateAccuracy, countLabels, detectTilt } from "@/features/analysis/lib/move-labels";
import type { MoveEval, LabelCounts } from "@/features/analysis/lib/move-labels";
import { detectTactics } from "@/features/training/lib/tactics";
import type { TacticOccurrence } from "@/features/training/lib/tactics";
import type { MultiPVLine } from "@/shared/workers/stockfish.worker";

export interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  movesAnalyzed: number;
  totalMoves: number;
  evals: MoveEval[];
  evalPoints: { ply: number; cp: number }[];
  accuracyWhite: number | null;
  accuracyBlack: number | null;
  countsWhite: LabelCounts;
  countsBlack: LabelCounts;
  tiltDetected: boolean;
  error: string | null;
  tactics: TacticOccurrence[];
}

const DEPTH_DESKTOP = 18;
const DEPTH_MOBILE = 14;
const THEORY_PLY_LIMIT = 10;

const EMPTY_COUNTS: LabelCounts = {
  brilliant: 0, great: 0, best: 0, excellent: 0,
  good: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, theory: 0,
  missed: 0, forced: 0,
};

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (typeof mem === "number" && mem <= 2);
}

function clampCp(cp: number): number {
  return Math.max(-1500, Math.min(1500, cp));
}

/** Detect material sacrifice: count piece values before/after */
function detectSacrifice(fenBefore: string, san: string, color: "w" | "b"): boolean {
  try {
    const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const chess = new Chess(fenBefore);
    const move = chess.move(san);
    if (!move || !move.captured) return false;
    const attackerVal = VALUES[move.piece] ?? 0;
    const capturedVal = VALUES[move.captured] ?? 0;
    return color === "w"
      ? capturedVal < attackerVal
      : capturedVal < attackerVal;
  } catch {
    return false;
  }
}

class StockfishPool {
  private workers: { worker: Worker; idle: boolean; currentResolve?: (val: any) => void; currentTimer?: ReturnType<typeof setTimeout> }[] = [];
  private queue: { id: string; fen: string; depth: number; multipv?: number; resolve: (val: any) => void; timeoutMs: number }[] = [];

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL("@/shared/workers/stockfish.worker.ts", import.meta.url), { type: "module" });
      w.addEventListener("message", (e) => this.onMessage(w, e));
      this.workers.push({ worker: w, idle: true });
    }
  }

  evalFen(fen: string, id: string, depth: number, multipv?: number, timeoutMs = 30000): Promise<{ cp: number; bestMove: string; mate: number | null; lines?: MultiPVLine[] }> {
    return new Promise((resolve) => {
      this.queue.push({ fen, id, depth, multipv, resolve, timeoutMs });
      this.pump();
    });
  }

  private pump() {
    if (this.queue.length === 0) return;
    const idleWorker = this.workers.find((w) => w.idle);
    if (!idleWorker) return;

    const task = this.queue.shift()!;
    idleWorker.idle = false;
    idleWorker.currentResolve = task.resolve;

    idleWorker.currentTimer = setTimeout(() => {
      idleWorker.worker.terminate();
      const newWorker = new Worker(new URL("@/shared/workers/stockfish.worker.ts", import.meta.url), { type: "module" });
      newWorker.addEventListener("message", (e) => this.onMessage(newWorker, e));
      idleWorker.worker = newWorker;
      idleWorker.idle = true;
      idleWorker.currentResolve = undefined;
      idleWorker.currentTimer = undefined;
      task.resolve({ cp: 0, bestMove: "", mate: null, error: "TIMEOUT" });
      this.pump();
    }, task.timeoutMs);

    idleWorker.worker.postMessage({ id: task.id, fen: task.fen, depth: task.depth, multipv: task.multipv });
  }

  private onMessage(worker: Worker, e: MessageEvent) {
    const w = this.workers.find((x) => x.worker === worker);
    if (!w) return;
    if (e.data?.id) {
      if (w.currentTimer) clearTimeout(w.currentTimer);
      w.idle = true;
      const resolve = w.currentResolve;
      w.currentResolve = undefined;
      w.currentTimer = undefined;
      if (resolve) {
        if (e.data.error) resolve({ cp: 0, bestMove: "", mate: null });
        else resolve({ cp: e.data.cp ?? 0, bestMove: e.data.bestMove ?? "", mate: e.data.mate ?? null, lines: e.data.lines });
      }
      this.pump();
    }
  }

  terminate() {
    for (const w of this.workers) w.worker.terminate();
  }
}

export function useAnalyzer(game: ParsedGame | null) {
  const poolRef = useRef<StockfishPool | null>(null);
  const hasAnalyzedRef = useRef(false);
  const abortRef = useRef(false);
  const lastGameRef = useRef<ParsedGame | null>(null);

  // Synchronously reset hasAnalyzedRef when game changes to avoid effect race conditions
  if (game !== lastGameRef.current) {
    lastGameRef.current = game;
    hasAnalyzedRef.current = false;
  }

  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    movesAnalyzed: 0,
    totalMoves: 0,
    evals: [],
    evalPoints: [],
    accuracyWhite: 0,
    accuracyBlack: 0,
    countsWhite: { ...EMPTY_COUNTS },
    countsBlack: { ...EMPTY_COUNTS },
    tiltDetected: false,
    error: null,
    tactics: [],
  });

  // Lazy pool initialization helper
  const getPool = useCallback(() => {
    if (!poolRef.current) {
      const poolSize = isMobile() ? 2 : 4;
      poolRef.current = new StockfishPool(poolSize);
    }
    return poolRef.current;
  }, []);

  useEffect(() => {
    return () => {
      poolRef.current?.terminate();
      poolRef.current = null;
    };
  }, []);

  const analyze = useCallback(async () => {
    const pool = getPool();
    if (!game || !pool) return;
    if (hasAnalyzedRef.current) return;
    hasAnalyzedRef.current = true;

    abortRef.current = false;
    const depth = isMobile() ? DEPTH_MOBILE : DEPTH_DESKTOP;
    const { moves, initialFen } = game;
    const total = moves.length;

    setState({
      isAnalyzing: true,
      progress: 0,
      movesAnalyzed: 0,
      totalMoves: total,
      evals: [],
      evalPoints: [],
      accuracyWhite: null,
      accuracyBlack: null,
      countsWhite: { ...EMPTY_COUNTS },
      countsBlack: { ...EMPTY_COUNTS },
      tiltDetected: false,
      error: null,
      tactics: [],
    });

    const allEvals: MoveEval[] = [];
    const evalPoints: { ply: number; cp: number }[] = [];
    const allTactics: TacticOccurrence[] = [];

    // Parse time control for dynamic profiling (P1)
    let baseTimeSec = 600; // default 10 mins
    let hasTimeControl = false;
    if (game.metadata.timeControl && game.metadata.timeControl !== "-") {
      const parsed = parseInt(game.metadata.timeControl.split("+")[0]);
      if (!isNaN(parsed) && parsed > 0) {
        baseTimeSec = parsed;
        hasTimeControl = true;
      }
    }
    const rushedThreshold = Math.max(2, baseTimeSec * 0.02);
    const longThinkThreshold = Math.max(10, baseTimeSec * 0.15);

    let prevResult = await pool.evalFen(initialFen, "init", depth, 2);

    const batchSize = isMobile() ? 2 : 4;
    for (let i = 0; i < moves.length; i += batchSize) {
      if (abortRef.current) break;

      const chunk = moves.slice(i, i + batchSize);
      const promises = chunk.map((m, idx) => pool.evalFen(m.fen, `m${i + idx}`, depth, 2));
      const chunkResults = await Promise.all(promises);

      for (let j = 0; j < chunk.length; j++) {
        const move = chunk[j];
        const evalBefore = prevResult.cp;
        const bestMove = prevResult.bestMove;

        const afterResult = chunkResults[j];
        const evalAfter = afterResult.cp;

        const playedUci = sanToUci(move.san, move.fenBefore);
        const isSacrifice = detectSacrifice(move.fenBefore, move.san, move.color);
        const chessObj = new Chess(move.fenBefore);
        const isForced = chessObj.moves().length === 1;
        const isPlayedBest = playedUci !== "" && playedUci === bestMove;
        
        const sign = move.color === "w" ? 1 : -1;
        const rawDelta = sign * (evalBefore - evalAfter);
        const plyCount = i + j;
        const isTheory = plyCount < 12 && Math.abs(evalAfter) <= 80 && rawDelta <= 50;

        // Calculate criticality (how sharp the position is)
        const criticality = prevResult.lines && prevResult.lines.length >= 2
          ? Math.abs(prevResult.lines[0].cp - prevResult.lines[1].cp)
          : 0;
          
        const isUniqueBest = criticality >= 150;

        const { label, delta, accuracy, isHardToFind } = classifyMove({
          evalBefore,
          evalAfter,
          bestEval: evalBefore,
          color: move.color,
          isSacrifice,
          isTheory,
          isPlayedBest,
          isForced,
          isUniqueBest,
          criticality,
        });

        // Psychological & Time Profiling
        let timeProfile: "rushed" | "calculation_error" | undefined = undefined;
        const timeSpent = move.timeSpentSeconds;
        const isCriticalMoment = criticality > 100 || (Math.abs(evalBefore) <= 50 && Math.abs(evalAfter) >= 150);

        if (timeSpent !== undefined && hasTimeControl) {
          if ((label === "blunder" || label === "mistake") && isCriticalMoment && timeSpent < rushedThreshold) {
            timeProfile = "rushed"; // Rushed decision in a critical moment
          } else if ((label === "blunder" || label === "mistake") && timeSpent > longThinkThreshold) {
            timeProfile = "calculation_error"; // Long think but still blundered
          }
        }

        allEvals.push({
          ply: move.ply,
          san: move.san,
          color: move.color,
          evalBefore,
          evalAfter,
          bestMove,
          bestEval: evalBefore,
          isSacrifice,
          label,
          delta,
          accuracy,
          mate: afterResult.mate,
          timeSpentSeconds: timeSpent,
          timeProfile,
          isHardToFind,
        });
        evalPoints.push({ ply: move.ply, cp: clampCp(evalAfter) });

        prevResult = afterResult;
      }
      
      const chunkTactics = detectTactics(chunk);
      allTactics.push(...chunkTactics);

      setState((s) => ({
        ...s,
        movesAnalyzed: Math.min(i + batchSize, total),
        progress: Math.round((Math.min(i + batchSize, total) / total) * 100),
        evals: [...allEvals],
        evalPoints: [...evalPoints],
      }));
    }

    const timeSpents = game.moves.map((m) => m.timeSpentSeconds);

    setState((s) => ({
      ...s,
      isAnalyzing: false,
      progress: 100,
      accuracyWhite: aggregateAccuracy(allEvals, "w"),
      accuracyBlack: aggregateAccuracy(allEvals, "b"),
      countsWhite: countLabels(allEvals, "w"),
      countsBlack: countLabels(allEvals, "b"),
      tiltDetected: detectTilt(allEvals, "w", timeSpents) || detectTilt(allEvals, "b", timeSpents),
      tactics: allTactics,
    }));
  }, [game]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    hasAnalyzedRef.current = false;
    setState((s) => ({ ...s, isAnalyzing: false, error: "Analysis cancelled." }));
  }, []);

  return { state, analyze, cancel };
}
