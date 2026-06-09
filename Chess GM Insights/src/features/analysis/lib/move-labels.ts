export type MoveLabel =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "okay"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "theory"
  | "missed"
  | "forced";

export interface MoveEval {
  ply: number;
  san: string;
  color: "w" | "b";
  evalBefore: number;
  evalAfter: number;
  bestMove: string;
  bestEval: number;
  isSacrifice: boolean;
  label: MoveLabel;
  delta: number;
  accuracy: number;
  mate?: number | null;
  timeSpentSeconds?: number;
  timeProfile?: "rushed" | "calculation_error";
  isHardToFind?: boolean;
}

/** Win probability from centipawns (logistic curve calibrated to Lichess data) */
export function winProb(cp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

/** Per-move accuracy score 0–100 */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const loss = Math.abs(wpBefore - wpAfter) * 100;
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}

/**
 * Win probability gain for the player who just moved.
 * Positive = player improved their winning chances.
 */
export function winProbGain(evalBefore: number, evalAfter: number, color: "w" | "b"): number {
  const sign = color === "w" ? 1 : -1;
  return winProb(sign * evalAfter) - winProb(sign * evalBefore);
}

export function classifyMove(opts: {
  evalBefore: number;
  evalAfter: number;
  bestEval: number;
  color: "w" | "b";
  isSacrifice: boolean;
  isTheory: boolean;
  /** True when the played UCI move matches Stockfish's best move */
  isPlayedBest: boolean;
  isForced: boolean;
  isUniqueBest?: boolean;
  criticality?: number;
}): { label: MoveLabel; delta: number; accuracy: number; isHardToFind: boolean } {
  const { evalBefore, evalAfter, color, isSacrifice, isTheory, isPlayedBest, isForced, isUniqueBest, criticality = 0 } = opts;

  if (isTheory) return { label: "theory", delta: 0, accuracy: 100, isHardToFind: false };
  if (isForced) return { label: "forced", delta: 0, accuracy: 100, isHardToFind: false };

  // Positive delta = bad for the player who just moved.
  const sign = color === "w" ? 1 : -1;
  const delta = sign * (evalBefore - evalAfter);

  const wpBefore = winProb(sign * evalBefore);
  const wpAfter  = winProb(sign * evalAfter);
  const accuracy = moveAccuracy(wpBefore, wpAfter);
  // Win probability jump for this player (positive = improved position)
  const wpJump = wpAfter - wpBefore;

  let label: MoveLabel;
  let isHardToFind = false;

  // ── Missed Win ────────────────────────────────────────────────────────────────
  // Player was winning (>= +2.0 pawns) but allowed opponent back to nearly equal
  const wasWinning = sign * evalBefore >= 200;
  const isNowNotWinning = sign * evalAfter < 75; // tightened from 100 → 75 cp

  // ── Brilliant !! ──────────────────────────────────────────────────────────────
  // Chess.com criteria: best move AND significant win probability JUMP (+10% WP)
  // OR: material sacrifice (including into-empty-square) that maintains clear advantage.
  // FIX: isSacrifice was only checking capture moves; now also covers positional sacs
  // where the player voluntarily puts a high-value piece en prise (evalBefore was >= 0
  // and the move is still best).
  const isPositionalSac = isPlayedBest && sign * evalBefore <= 50 && wpJump >= 0.12;
  const isMaterialSacWithAdvantage = isSacrifice && isPlayedBest && sign * evalAfter >= 200;

  if (isPositionalSac || isMaterialSacWithAdvantage) {
    label = "brilliant";
  } else if (isPlayedBest && isUniqueBest) {
    // Great !: Best AND unique (2nd-best alternative is >= 1.5 pawns worse)
    label = "great";
  } else if (wasWinning && isNowNotWinning) {
    label = "missed";
  } else if (isPlayedBest) {
    // Best ★: Matches engine top recommendation
    label = "best";
  } else if (delta <= 10) {
    // Excellent 👍: Nearly as good as the best move (< 10 cp loss)
    label = "excellent";
  } else if (delta <= 30) {
    label = "good";
  } else if (delta <= 60) {
    label = "okay";
  } else if (delta <= 120) {
    label = "inaccuracy";
  } else if (delta <= 200) {
    // Complexity forgiveness: if the position was wildly complex (criticality > 150)
    // and they made a mistake, downgrade it to inaccuracy.
    if (criticality > 150 && !isPlayedBest) {
      label = "inaccuracy";
      isHardToFind = true;
    } else {
      label = "mistake";
    }
  } else {
    // Forgiveness for blunders in impossible positions
    if (criticality > 300 && delta <= 250 && !isPlayedBest) {
      label = "mistake";
      isHardToFind = true;
    } else {
      label = "blunder";
    }
  }

  return { label, delta, accuracy, isHardToFind };
}

export function aggregateAccuracy(
  evals: Pick<MoveEval, "accuracy" | "color" | "label" | "evalBefore">[],
  color: "w" | "b",
): number | null {
  const relevant = evals.filter((e) => e.color === color && e.label !== "forced");
  if (relevant.length < 3) return null;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const e of relevant) {
    const cp = Math.abs(e.evalBefore);
    let weight = 1.0;
    
    // CAPS2-style weighting:
    // Positions under +/- 1.5 pawns (150 cp) are highly critical (weight = 1.0).
    // Between 1.5 pawns and 10 pawns (1000 cp), weight decays linearly down to 0.1.
    // Beyond 10 pawns, the outcome is decided, so weight remains at a minimum of 0.1.
    if (cp > 150) {
      if (cp >= 1000) {
        weight = 0.1;
      } else {
        weight = 0.1 + (0.9 * (1000 - cp)) / 850;
      }
    }

    weightedSum += e.accuracy * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export type LabelCounts = Record<MoveLabel, number>;

export function countLabels(evals: MoveEval[], color: "w" | "b"): LabelCounts {
  const counts: LabelCounts = {
    brilliant: 0, great: 0, best: 0, excellent: 0,
    good: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, theory: 0,
    missed: 0, forced: 0,
  };
  for (const e of evals) {
    if (e.color === color) counts[e.label]++;
  }
  return counts;
}

/** Tilt: 3+ consecutive bad moves with time < 4s each */
export function detectTilt(
  evals: MoveEval[],
  color: "w" | "b",
  timeSpents: (number | undefined)[],
): boolean {
  // Disable tilt warning entirely if there is no PGN clock data to avoid false positives
  const hasTimeData = timeSpents.some((t) => t !== undefined);
  if (!hasTimeData) return false;

  let streak = 0;
  for (const e of evals) {
    if (e.color !== color) continue;
    const t = timeSpents[e.ply - 1]; // ply is 1-indexed, array 0-indexed
    const isBad = e.label === "mistake" || e.label === "blunder" || e.label === "inaccuracy" || e.label === "missed";
    const isRush = t !== undefined && t < 4;
    if (isBad && isRush) {
      streak++;
      if (streak >= 3) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}
