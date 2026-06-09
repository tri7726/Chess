import { useEffect, useMemo, useCallback, useState, lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BoardControls } from "@/features/game/components/BoardControls";
import { EvalChart } from "@/features/analysis/components/EvalChart";
import { TimeChart } from "@/features/analysis/components/TimeChart";
import { AICoachCard } from "@/features/ai-coach/components/AICoachCard";
import { StatsTable } from "@/features/analysis/components/StatsTable";
import { MovesList } from "@/features/analysis/components/MovesList";
import { SyzygyBadge } from "@/features/analysis/components/SyzygyBadge";
import { EvalBar } from "@/features/analysis/components/EvalBar";
import { OpeningExplorer } from "@/features/analysis/components/OpeningExplorer";
import { BlunderPhaseChart } from "@/features/analysis/components/BlunderPhaseChart";
import { RadarStatsChart } from "@/features/analysis/components/RadarStatsChart";
import { BoardThemePicker, useBoardTheme } from "@/features/game/components/BoardThemePicker";
import { ShareCardButton } from "@/features/game/components/ShareCardButton";
import { TrainingTab } from "@/features/training/components/TrainingTab";
import { BottomBar } from "@/features/game/components/BottomBar";
import { playChessSound } from "@/shared/lib/sound";
import { ContinueVsStockfish } from "@/features/continue-play/components/ContinueVsStockfish";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { AlertTriangle, PanelRightOpen, Loader2, X, Swords } from "lucide-react";

// Lazy import browser-only modules — prevents SSR crash
const ChessBoard = lazy(() => import("@/shared/components/board/ChessBoard").then((m) => ({ default: m.ChessBoard })));

import { ChessBoardPlaceholder } from "@/shared/components/board/ChessBoardPlaceholder";
import { Confetti } from "@/shared/components/effects/Confetti";

import { Chess } from "chess.js";
import { parsePgn } from "@/features/game/lib/pgn-parser";
import { useAnalyzer } from "@/features/analysis/hooks/useAnalyzer";
import { useLiveAnalysis } from "@/features/analysis/hooks/useLiveAnalysis";
import { LiveLinesTable } from "@/features/analysis/components/LiveLinesTable";
import { analyzePawnStructure, generatePuzzlesFromGame } from "@/features/training/lib/tactics";
import type { PawnStructureReport } from "@/features/training/lib/tactics";
import type { ParsedGame } from "@/features/game/lib/pgn-parser";
import type { AnalysisState } from "@/features/analysis/hooks/useAnalyzer";
import type { LabelCounts } from "@/features/analysis/lib/move-labels";

const EMPTY_COUNTS: LabelCounts = {
  brilliant: 0, great: 0, best: 0, excellent: 0,
  good: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, theory: 0,
  missed: 0, forced: 0,
};

const INITIAL_ANALYSIS: AnalysisState = {
  isAnalyzing: false, progress: 0, movesAnalyzed: 0, totalMoves: 0,
  evals: [], evalPoints: [], accuracyWhite: 0, accuracyBlack: 0,
  countsWhite: EMPTY_COUNTS, countsBlack: EMPTY_COUNTS,
  tiltDetected: false, error: null, tactics: [],
};

export const Route = createFileRoute("/game/$hash")({
  head: ({ params }) => ({
    meta: [
      { title: `Analysis ${params.hash} — V-Max` },
      { name: "description", content: "Move-by-move chess analysis with eval chart and labels." },
    ],
  }),
  component: GamePage,
});

// ──────────────────────────────────────────────────────
// Analysis Panel (right side)
// ──────────────────────────────────────────────────────
function AnalysisPanel({
  game,
  state,
  currentPly,
  currentFen,
  gameHash,
  onPlyClick,
  onCancel,
  whitePlayerName,
  blackPlayerName,
  isSelfAnalysis = false,
  selfAnalysisFen = null,
}: {
  game: ParsedGame | null;
  state: ReturnType<typeof useAnalyzer>["state"];
  currentPly: number;
  currentFen: string;
  gameHash: string;
  onPlyClick: (ply: number) => void;
  onCancel: () => void;
  whitePlayerName?: string;
  blackPlayerName?: string;
  isSelfAnalysis?: boolean;
  selfAnalysisFen?: string | null;
}) {
  const gameResult = game?.metadata?.result ?? "*";
  const pawnStructure = useMemo(() => analyzePawnStructure(currentFen), [currentFen]);
  const gameMistakes = useMemo(() => {
    return state.evals
      .filter((e) => e.label === "blunder" || e.label === "mistake")
      .map((e) => ({ ply: e.ply, label: e.label }));
  }, [state.evals]);

  const currentEval = useMemo(() => {
    return state.evals.find((e) => e.ply === currentPly);
  }, [state.evals, currentPly]);

  const performanceElo = useMemo(() => {
    if (state.isAnalyzing || state.evals.length === 0) return null;
    const baseElo = 1200;
    const brilliantW = state.countsWhite.brilliant || 0;
    const greatW = state.countsWhite.great || 0;
    const blunderW = state.countsWhite.blunder || 0;
    const accW = state.accuracyWhite || 0;
    const performanceW = Math.round(
      baseElo + (accW - 72.5) * 18 + brilliantW * 75 + greatW * 40 - blunderW * 95
    );
    const eloW = Math.max(100, Math.min(3200, performanceW));

    const brilliantB = state.countsBlack.brilliant || 0;
    const greatB = state.countsBlack.great || 0;
    const blunderB = state.countsBlack.blunder || 0;
    const accB = state.accuracyBlack || 0;
    const performanceB = Math.round(
      baseElo + (accB - 72.5) * 18 + brilliantB * 75 + greatB * 40 - blunderB * 95
    );
    const eloB = Math.max(100, Math.min(3200, performanceB));

    return { white: eloW, black: eloB };
  }, [state.isAnalyzing, state.evals, state.countsWhite, state.countsBlack, state.accuracyWhite, state.accuracyBlack]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Share button — top right */}
      {!state.isAnalyzing && state.evals.length > 0 && (
        <div className="flex justify-end">
          <ShareCardButton
            fen={currentFen}
            whitePlayer={whitePlayerName}
            blackPlayer={blackPlayerName}
            accuracyWhite={state.accuracyWhite}
            accuracyBlack={state.accuracyBlack}
            result={gameResult}
            brilliantCountW={state.countsWhite.brilliant}
            brilliantCountB={state.countsBlack.brilliant}
            blunderCountW={state.countsWhite.blunder}
            blunderCountB={state.countsBlack.blunder}
            gameHash={gameHash}
          />
        </div>
      )}
      {/* Progress bar while analyzing */}
      {state.isAnalyzing && (
        <div className="space-y-1 rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing… move {state.movesAnalyzed}/{state.totalMoves}
            </span>
            <button onClick={onCancel} className="flex items-center gap-1 hover:text-foreground">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
          <Progress value={state.progress} className="h-1.5" />
        </div>
      )}

      {/* Tilt warning */}
      {state.tiltDetected && !state.isAnalyzing && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Tilt detected.</strong> After a big mistake, 3+ quick poor moves followed. Take a breath before your next game.
          </span>
        </div>
      )}

      <Tabs defaultValue="overview" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moves">Moves</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-3 space-y-3 h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar pr-2 pb-10">
          {currentEval && !state.isAnalyzing && (() => {
            const contextLines = [
              currentEval.isHardToFind ? "- Tình huống cực kỳ phức tạp, nước tốt nhất rất khó nhìn ra." : "",
              currentEval.timeProfile === "rushed" ? "- Người chơi đã đi một nước cờ quá vội vã trong thời khắc quyết định." : "",
              currentEval.timeProfile === "calculation_error" ? "- Người chơi suy nghĩ rất lâu nhưng vẫn tính sót nước." : "",
              currentEval.mate ? `- Vị trí này sẽ dẫn đến chiếu bí trong ${Math.abs(currentEval.mate)} nước.` : "",
              ...state.tactics.filter((t) => t.ply === currentPly).map((t) => `- Có cơ hội hoặc đe dọa chiến thuật: ${t.type.toUpperCase()} (${t.description})`)
            ].filter(Boolean).join("\n");

            return (
              <AICoachCard
                currentPly={currentPly}
                fen={currentFen}
                san={currentEval.san}
                label={currentEval.label}
                delta={currentEval.delta}
                bestMove={currentEval.bestMove}
                context={contextLines}
              />
            );
          })()}

          {/* Hide these on extra large screens because they will be in the left column */}
          <div className="xl:hidden flex flex-col gap-3">
            <EvalChart
              data={state.evalPoints.map((p) => ({
                move: p.ply,
                eval: parseFloat((p.cp / 100).toFixed(2)),
                fen: game?.moves.find(m => m.ply === p.ply)?.fen ?? "",
              }))}
              onMoveClick={onPlyClick}
            />

            {game && game.moves.some(m => m.timeSpentSeconds !== undefined) && (
              <TimeChart 
                data={game.moves.map((m) => ({
                  move: m.ply,
                  time: m.timeSpentSeconds ?? 0,
                  color: m.color,
                }))}
              />
            )}

            {currentPly <= 30 && <OpeningExplorer fen={isSelfAnalysis && selfAnalysisFen ? selfAnalysisFen : currentFen} />}
          </div>

          <StatsTable
            white={state.countsWhite}
            black={state.countsBlack}
            accuracyWhite={state.accuracyWhite || undefined}
            accuracyBlack={state.accuracyBlack || undefined}
            whitePlayerName={whitePlayerName}
            blackPlayerName={blackPlayerName}
            whiteElo={performanceElo?.white}
            blackElo={performanceElo?.black}
          />

          {!state.isAnalyzing && state.evals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadarStatsChart
                evals={state.evals}
                accW={state.accuracyWhite}
                accB={state.accuracyBlack}
                countsW={state.countsWhite}
                countsB={state.countsBlack}
                whiteName={whitePlayerName}
                blackName={blackPlayerName}
              />
              <BlunderPhaseChart mistakes={gameMistakes} />
            </div>
          )}

          {/* Tactical Insights */}
          {!state.isAnalyzing && state.tactics.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              <h4 className="mb-2 font-semibold text-xs text-muted-foreground">Tactics Detected</h4>
              <div className="space-y-1">
                {state.tactics.map((t, i) => (
                  <div key={i} className="flex gap-2 text-xs items-center cursor-pointer hover:bg-muted p-1 rounded" onClick={() => onPlyClick(t.ply)}>
                    <span className="shrink-0">{t.color === "w" ? "⬜" : "⬛"}</span>
                    <span>{t.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pawn Structure */}
          {!state.isAnalyzing && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-card p-2 space-y-1">
                <div className="font-semibold text-muted-foreground mb-1">White Pawns</div>
                <div className="flex justify-between"><span>Doubled:</span> <span>{pawnStructure.doubledPawnsW}</span></div>
                <div className="flex justify-between"><span>Isolated:</span> <span>{pawnStructure.isolatedPawnsW}</span></div>
                <div className="flex justify-between"><span>Passed:</span> <span>{pawnStructure.passedPawnsW}</span></div>
              </div>
              <div className="rounded-lg border border-border bg-card p-2 space-y-1">
                <div className="font-semibold text-muted-foreground mb-1">Black Pawns</div>
                <div className="flex justify-between"><span>Doubled:</span> <span>{pawnStructure.doubledPawnsB}</span></div>
                <div className="flex justify-between"><span>Isolated:</span> <span>{pawnStructure.isolatedPawnsB}</span></div>
                <div className="flex justify-between"><span>Passed:</span> <span>{pawnStructure.passedPawnsB}</span></div>
              </div>
            </div>
          )}

          {/* Narrative — show key moments */}
          {state.evals.length > 0 && !state.isAnalyzing && (
            <div className="max-h-48 overflow-auto rounded-lg border border-border bg-card p-3 text-sm">
              {generateNarrative(state.evals, game, state.tactics)}
            </div>
          )}

          {state.evals.length === 0 && !state.isAnalyzing && (
            <p className="text-center text-sm italic text-muted-foreground py-4">
              Analysis will appear here…
            </p>
          )}
        </TabsContent>

        {/* ── MOVES TAB ── */}
        <TabsContent value="moves" className="mt-3 h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar pr-2 pb-10">
          <MovesList
            moves={game?.moves ?? []}
            evals={state.evals}
            currentPly={currentPly}
            onPlyClick={onPlyClick}
          />
        </TabsContent>

        {/* ── TRAINING TAB ── */}
        <TabsContent value="training" className="mt-3 h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar pr-2 pb-10">
          <TrainingTab gameHash={gameHash} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Narrative generator (20+ templates)
// ──────────────────────────────────────────────────────
function generateNarrative(
  evals: ReturnType<typeof useAnalyzer>["state"]["evals"],
  game: ParsedGame | null,
  tactics?: ReturnType<typeof useAnalyzer>["state"]["tactics"],
): React.ReactNode {
  if (evals.length === 0 || !game) return null;

  const lines: string[] = [];

  const blunders   = evals.filter((e) => e.label === "blunder");
  const brilliant  = evals.filter((e) => e.label === "brilliant");
  const great      = evals.filter((e) => e.label === "great");
  const mistakes   = evals.filter((e) => e.label === "mistake");
  const inaccuracies = evals.filter((e) => e.label === "inaccuracy");
  const theoryMoves  = evals.filter((e) => e.label === "theory");

  const wEvals = evals.filter((e) => e.color === "w");
  const bEvals = evals.filter((e) => e.color === "b");
  const wAccuracy = wEvals.length ? Math.round(wEvals.reduce((s, e) => s + e.accuracy, 0) / wEvals.length) : 0;
  const bAccuracy = bEvals.length ? Math.round(bEvals.reduce((s, e) => s + e.accuracy, 0) / bEvals.length) : 0;

  const totalMoves = game.totalPlies;
  const result = game.metadata.result;
  const wName = game.metadata.white ?? "White";
  const bName = game.metadata.black ?? "Black";

  // ── Opening ──────────────────────────────────────────
  if (theoryMoves.length >= 6) {
    const openingName = game.metadata.opening ?? "known lines";
    lines.push(`📖 Both players were well-prepared, following theory for ${theoryMoves.length} moves into ${openingName}.`);
  } else if (theoryMoves.length > 0) {
    lines.push(`📖 ${theoryMoves.length} theory moves played before players deviated from known preparation.`);
  } else {
    lines.push(`🎭 Players diverged from theory early — this was a creative, uncharted battle.`);
  }

  // ── Brilliant ─────────────────────────────────────────
  if (brilliant.length > 0) {
    const b = brilliant[0];
    const side = b.color === "w" ? wName : bName;
    const mn = Math.ceil(b.ply / 2);
    lines.push(`🌟 ${side}'s ${mn}. ${b.san} was a brilliant sacrifice — engines confirm it was both the best move and a decisive material investment.`);
    if (brilliant.length > 1) {
      lines.push(`⭐ ${brilliant.length - 1} more brilliant move${brilliant.length > 2 ? "s" : ""} occurred. This was exceptionally creative play.`);
    }
  }

  // ── Great moves ───────────────────────────────────────
  if (great.length >= 3 && brilliant.length === 0) {
    const side = great[0].color === "w" ? wName : bName;
    lines.push(`💡 ${side} found ${great.length} exact engine moves during the game — exceptional precision.`);
  }

  // ── Tactics detected ──────────────────────────────────
  if (tactics && tactics.length > 0) {
    // Group tactics by type
    const forkCount = tactics.filter((t) => t.type === "fork").length;
    const pinCount = tactics.filter((t) => t.type === "pin").length;
    const skewerCount = tactics.filter((t) => t.type === "skewer").length;

    const parts: string[] = [];
    if (forkCount > 0) parts.push(`${forkCount} fork${forkCount > 1 ? "s" : ""}`);
    if (pinCount > 0) parts.push(`${pinCount} pin${pinCount > 1 ? "s" : ""}`);
    if (skewerCount > 0) parts.push(`${skewerCount} skewer${skewerCount > 1 ? "s" : ""}`);

    if (parts.length > 0) {
      lines.push(`⚔️ Tactical opportunities were present: we detected ${parts.join(", ")} during this game.`);
    }
  }

  // ── Key turning point (first big blunder) ────────────
  if (blunders.length > 0) {
    const bl = blunders[0];
    const side = bl.color === "w" ? wName : bName;
    const mn = Math.ceil(bl.ply / 2);
    const drop = (Math.abs(bl.delta) / 100).toFixed(1);
    lines.push(`❌ The turning point came on move ${mn}: ${side}'s ${bl.san} dropped the eval by ${drop} pawns — the critical mistake of the game.`);

    if (blunders.length > 1) {
      lines.push(`⚠️ ${blunders.length - 1} additional blunder${blunders.length > 2 ? "s" : ""} followed. Check the Training tab for targeted practice.`);
    }
  }

  // ── Mistakes ─────────────────────────────────────────
  if (mistakes.length > 0 && blunders.length === 0) {
    lines.push(`⚠️ ${mistakes.length} mistake${mistakes.length > 1 ? "s" : ""} were made — no blunders, but there were missed opportunities.`);
  }

  // ── Inaccuracies only ─────────────────────────────────
  if (inaccuracies.length > 0 && mistakes.length === 0 && blunders.length === 0) {
    lines.push(`🎯 Only inaccuracies — no serious errors. Both players maintained solid technique throughout.`);
  }

  // ── Accuracy commentary ───────────────────────────────
  const higherAcc = wAccuracy >= bAccuracy ? { name: wName, acc: wAccuracy } : { name: bName, acc: bAccuracy };
  const lowerAcc  = wAccuracy >= bAccuracy ? { name: bName, acc: bAccuracy } : { name: wName, acc: wAccuracy };

  if (higherAcc.acc >= 95) {
    lines.push(`🏆 ${higherAcc.name} played at ${higherAcc.acc}% accuracy — near-perfect engine alignment.`);
  } else if (higherAcc.acc >= 85) {
    lines.push(`📈 ${higherAcc.name} outperformed with ${higherAcc.acc}% vs ${lowerAcc.acc}% — a clear positional edge in decision-making.`);
  } else if (Math.abs(wAccuracy - bAccuracy) <= 5) {
    lines.push(`⚖️ Evenly matched in accuracy: ${wName} ${wAccuracy}% vs ${bName} ${bAccuracy}%.`);
  }

  // ── Game length ───────────────────────────────────────
  if (totalMoves > 80) {
    lines.push(`🕒 A marathon ${Math.ceil(totalMoves / 2)}-move game — both players showed exceptional endurance.`);
  } else if (totalMoves < 30) {
    lines.push(`⚡ A sharp ${Math.ceil(totalMoves / 2)}-move game — decisive early, no slow maneuvering.`);
  }

  // ── Time Management & Psychology ──────────────────────
  const rushedBlunders = evals.filter((e) => e.timeProfile === "rushed");
  const calculationErrors = evals.filter((e) => e.timeProfile === "calculation_error");
  const complexMistakes = evals.filter((e) => e.isHardToFind && (e.label === "mistake" || e.label === "inaccuracy"));

  if (rushedBlunders.length > 0) {
    const b = rushedBlunders[0];
    const side = b.color === "w" ? wName : bName;
    const mn = Math.ceil(b.ply / 2);
    lines.push(`⏳ Tâm lý: Ở nước thứ ${mn}, ${side} đã ra quyết định quá vội vã trong một thế cờ căng thẳng (<5s), dẫn đến sai lầm. Hãy chậm lại ở những thời khắc quyết định!`);
  }

  if (calculationErrors.length > 0) {
    lines.push(`🧠 Tính toán: Có những nước đi bạn suy nghĩ rất lâu (>45s) nhưng vẫn mắc lỗi. Đây là dấu hiệu của việc "tính nhầm" (calculation error) - hãy luyện tập thêm chiến thuật.`);
  }

  if (complexMistakes.length > 0) {
    lines.push(`🧩 Phức tạp: Hệ thống phát hiện ${complexMistakes.length} tình huống cực kỳ phức tạp (chỉ có 1 nước đi đúng duy nhất). Bạn đã bị trừ điểm nhẹ, nhưng đừng quá bận tâm vì đến cả Kiện tướng cũng khó nhìn ra!`);
  }

  // ── Result commentary ─────────────────────────────────
  if (result === "1/2-1/2") {
    lines.push(`🤝 The game ended in a draw — a balanced, well-contested battle to the end.`);
  } else if (result === "1-0" && blunders.some((b) => b.color === "b")) {
    lines.push(`♟️ ${wName} converted after ${bName}'s critical error. The win was earned through precision after the mistake.`);
  } else if (result === "0-1" && blunders.some((b) => b.color === "w")) {
    lines.push(`♟️ ${bName} converted after ${wName}'s critical error. The win was earned through precision after the mistake.`);
  }

  // ── Clean game ────────────────────────────────────────
  if (blunders.length === 0 && mistakes.length === 0) {
    lines.push(`✨ A clean game — no blunders, no major mistakes. Excellent accuracy on both sides!`);
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────
function GamePage() {
  const { hash } = Route.useParams();
  const [pgn, setPgn] = useState("");
  const [heatmap, setHeatmap] = useState(false);
  const [currentPly, setCurrentPly] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [multiPvEnabled, setMultiPvEnabled] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Self Analysis State
  const [isSelfAnalysis, setIsSelfAnalysis] = useState(false);
  const [selfAnalysisFen, setSelfAnalysisFen] = useState<string | null>(null);
  const [selfAnalysisMoves, setSelfAnalysisMoves] = useState<string[]>([]);

  // Blunder Retry State
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryBoardFen, setRetryBoardFen] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ success: boolean; text: string } | null>(null);
  
  // Confetti trigger
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Board theme
  const { theme: boardTheme, setTheme: setBoardTheme } = useBoardTheme();

  // NOTE: retryStartFen depends on `game` which is declared below — moved to after game declaration

  function handleRetryMove(orig: string, dest: string) {
    if (!game || !retryStartFen) return;
    const engineSuggest = state.evals.find((e) => e.ply === currentPly);
    if (!engineSuggest || !engineSuggest.bestMove) return;

    const uciMove = `${orig}${dest}`;
    const bestUci = engineSuggest.bestMove.slice(0, 4);

    try {
      const chess = new Chess(isRetrying && retryBoardFen ? retryBoardFen : retryStartFen);
      const res = chess.move({ from: orig, to: dest, promotion: "q" });
      setRetryBoardFen(chess.fen());
      
      if (res.san.includes("+") || res.san.includes("#")) {
        playChessSound("check");
      } else if (res.san.includes("x")) {
        playChessSound("capture");
      } else {
        playChessSound("move");
      }
    } catch {
      return;
    }

    if (uciMove === bestUci) {
      setRetryFeedback({ success: true, text: "🎉 Tuyệt vời! Bạn đã tìm ra nước đi tối ưu của Máy tính!" });
      playChessSound("victory");
      setConfettiTrigger((c) => c + 1);
    } else {
      setRetryFeedback({ success: false, text: "❌ Sai rồi. Đó chưa phải là nước đi tốt nhất. Hãy thử lại!" });
      playChessSound("blunder");
      setTimeout(() => {
        setRetryBoardFen(retryStartFen);
        setRetryFeedback(null);
      }, 2000);
    }
  }

  function handleSelfAnalysisMove(orig: string, dest: string) {
    if (state.isAnalyzing) return;
    const baseFen = isSelfAnalysis && selfAnalysisFen ? selfAnalysisFen : currentFen;
    try {
      const chess = new Chess(baseFen);
      const res = chess.move({ from: orig, to: dest, promotion: "q" });
      if (res.san.includes("+") || res.san.includes("#")) {
        playChessSound("check");
      } else if (res.san.includes("x")) {
        playChessSound("capture");
      } else {
        playChessSound("move");
      }
      if (!isSelfAnalysis) {
        setIsSelfAnalysis(true);
      }
      setSelfAnalysisFen(chess.fen());
      setSelfAnalysisMoves((prev) => [...prev, res.san]);
    } catch {
      return;
    }
  }

  // Cancel retry mode and self analysis when navigating
  useEffect(() => {
    setIsRetrying(false);
    setRetryFeedback(null);
    setIsSelfAnalysis(false);
    setSelfAnalysisFen(null);
    setSelfAnalysisMoves([]);
  }, [currentPly]);

  const game: ParsedGame | null = useMemo(() => {
    if (!pgn.trim()) return null;
    return parsePgn(pgn);
  }, [pgn]);

  // retryStartFen depends on `game` — must come after it
  const retryStartFen = useMemo(() => {
    if (!game || currentPly === 0) return null;
    if (currentPly === 1) return game.initialFen;
    return game.moves[currentPly - 2]?.fen ?? game.initialFen;
  }, [game, currentPly]);

  // Analysis engine
  const { state, analyze, cancel } = useAnalyzer(game);

  // Autoplay & shortcuts state
  const [isPlaying, setIsPlaying] = useState(false);
  const [prevPly, setPrevPly] = useState(0);

  // Play sound on ply navigation
  useEffect(() => {
    if (!game) return;
    if (currentPly === 0) {
      setPrevPly(0);
      return;
    }

    const isForward = currentPly > prevPly;
    setPrevPly(currentPly);

    const move = game.moves[currentPly - 1];
    if (!move) return;

    if (isForward) {
      const moveEval = state.evals.find((e) => e.ply === currentPly);
      if (moveEval && !state.isAnalyzing) {
        if (moveEval.label === "brilliant") {
          playChessSound("brilliant");
          setConfettiTrigger((c) => c + 1);
          return;
        } else if (moveEval.label === "great") {
          playChessSound("victory");
          setConfettiTrigger((c) => c + 1);
          return;
        } else if (moveEval.label === "blunder") {
          playChessSound("blunder");
          return;
        }
      }

      if (move.san.includes("#")) {
        playChessSound("victory");
      } else if (move.san.includes("+")) {
        playChessSound("check");
      } else if (move.san.includes("x")) {
        playChessSound("capture");
      } else if (move.san.includes("O-O")) {
        playChessSound("castle");
      } else if (move.san.includes("=")) {
        playChessSound("promote");
      } else {
        playChessSound("move");
      }
    } else {
      playChessSound("move");
    }
  }, [currentPly, game, state.evals, state.isAnalyzing]);

  // Autoplay timer — uses game?.totalPlies to avoid hoisting issues
  useEffect(() => {
    if (!isPlaying) return;
    const curTotal = game?.totalPlies ?? 0;
    if (currentPly >= curTotal) {
      setIsPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      goToPly(currentPly + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, currentPly, game]);

  // Keyboard controls — uses game?.totalPlies to avoid hoisting issues
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const curTotal = game?.totalPlies ?? 0;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPly(currentPly - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToPly(currentPly + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPly(0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToPly(curTotal);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPly, game]);

  // Current FEN based on ply
  const currentFen = useMemo(() => {
    if (!game) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    if (currentPly === 0) return game.initialFen;
    const move = game.moves[currentPly - 1];
    return move?.fen ?? game.initialFen;
  }, [game, currentPly]);

  const liveAnalysisFen = useMemo(() => {
    return isSelfAnalysis && selfAnalysisFen ? selfAnalysisFen : currentFen;
  }, [isSelfAnalysis, selfAnalysisFen, currentFen]);

  const { lines: liveLines, isThinking: isLiveThinking } = useLiveAnalysis({
    fen: liveAnalysisFen,
    enabled: multiPvEnabled || isSelfAnalysis,
    depth: 14,
    multipv: 3,
  });

  // Detect resignation: decisive result AND last move is not checkmate
  const isResignation = useMemo(() => {
    if (!game) return false;
    const result = game.metadata.result;
    if (result !== "1-0" && result !== "0-1") return false;
    const lastMove = game.moves[game.moves.length - 1];
    if (!lastMove) return false;
    return !lastMove.san.includes("#");
  }, [game]);

  /** FEN of the final position (where resignation happened) */
  const finalFen = useMemo(() => {
    if (!game || game.moves.length === 0) return game?.initialFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    return game.moves[game.moves.length - 1].fen;
  }, [game]);

  /** Side that resigned: loser is opposite of result winner */
  const resignedSide = useMemo((): "white" | "black" => {
    return game?.metadata.result === "1-0" ? "black" : "white";
  }, [game]);

  // Fix: use from/to fields now available in ParsedMove
  const lastMove = useMemo((): [string, string] | undefined => {
    if (!game || currentPly === 0) return undefined;
    const move = game.moves[currentPly - 1];
    if (!move) return undefined;
    return [move.from, move.to];
  }, [game, currentPly]);

  const currentEval = useMemo(() => {
    if (currentPly === 0) return undefined;
    return state.evals.find((e) => e.ply === currentPly);
  }, [state.evals, currentPly]);
  const boardShapes = useMemo(() => {
    const list: { orig: string; dest?: string; brush: string }[] = [];

    // 1. Add heatmap shapes
    if (heatmap && game) {
      game.moves.forEach((m) => {
        const ev = state.evals.find((e) => e.ply === m.ply);
        if (!ev) return;
        let brush = "";
        if (ev.label === "blunder") brush = "red";
        else if (ev.label === "mistake" || ev.label === "inaccuracy") brush = "yellow";
        else if (ev.label === "brilliant" || ev.label === "great") brush = "green";
        else return;

        list.push({ orig: m.to, brush });
      });
    }

    // 2. Add Multi-PV arrows if enabled
    if (multiPvEnabled && liveLines && liveLines.length > 0) {
      liveLines.forEach((l) => {
        if (l.bestMove && l.bestMove.length >= 4) {
          const orig = l.bestMove.slice(0, 2);
          const dest = l.bestMove.slice(2, 4);
          
          let brush = "green"; // multipv 1
          if (l.multipv === 2) brush = "blue";
          if (l.multipv === 3) brush = "red";
          
          list.push({ orig, dest, brush });
        }
      });
    }
    // 3. Add best move arrow for the NEXT move to be played (at index currentPly) if Multi-PV is disabled
    else if (!state.isAnalyzing && currentPly < (game?.totalPlies ?? 0)) {
      const nextEval = state.evals.find((e) => e.ply === currentPly + 1);
      if (nextEval && nextEval.bestMove && nextEval.bestMove.length >= 4) {
        const orig = nextEval.bestMove.slice(0, 2);
        const dest = nextEval.bestMove.slice(2, 4);
        list.push({ orig, dest, brush: "blue" });
      }
    }

    return list;
  }, [heatmap, game, state.evals, state.isAnalyzing, currentPly, multiPvEnabled, liveLines]);
  // Load PGN from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`vmax:pgn:${hash}`);
      if (stored) setPgn(stored);
    }
  }, [hash]);

  // Fix: analyze uses useCallback with game dep — safe to include
  useEffect(() => {
    if (game) analyze();
  }, [game, analyze]);

  // Generate puzzles when analysis finishes
  useEffect(() => {
    if (!state.isAnalyzing && state.evals.length > 0 && game) {
      generatePuzzlesFromGame(game.moves, state.evals, hash);
    }
  }, [state.isAnalyzing]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPlies = game?.totalPlies ?? 0;

  function goToPly(ply: number) {
    setCurrentPly(Math.max(0, Math.min(ply, totalPlies)));
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <Confetti trigger={confettiTrigger} />
      <div className="mx-auto w-full max-w-[1600px] h-full flex-1 px-4 py-4 overflow-hidden">
        {!pgn && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">No game loaded.</p>
            <p className="text-sm text-muted-foreground">Upload a PGN from the home page to start analysis.</p>
          </div>
        )}

        {pgn && (
          <div className={`grid h-full gap-4 transition-all duration-300 ${isPanelCollapsed ? "max-w-[800px] mx-auto w-full" : "lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[260px_1fr_360px] lg:gap-6"}`}>
            
            {/* ── Left Column (Extra Data - XL only) ── */}
            {!isPanelCollapsed && (
              <div className="hidden xl:flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-8 custom-scrollbar">
                <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3 shadow-sm">
                  <h3 className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Evaluation Chart</h3>
                  <EvalChart
                    data={state.evalPoints.map((p) => ({
                      move: p.ply,
                      eval: parseFloat((p.cp / 100).toFixed(2)),
                      fen: game?.moves.find(m => m.ply === p.ply)?.fen ?? "",
                    }))}
                    onMoveClick={goToPly}
                  />
                </div>
                {game && game.moves.some(m => m.timeSpentSeconds !== undefined) && (
                  <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3 shadow-sm">
                    <h3 className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Time Control</h3>
                    <TimeChart 
                      data={game.moves.map((m) => ({
                        move: m.ply,
                        time: m.timeSpentSeconds ?? 0,
                        color: m.color,
                      }))}
                    />
                  </div>
                )}
                <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 min-h-[300px]">
                  {currentPly <= 30 && <OpeningExplorer fen={isSelfAnalysis && selfAnalysisFen ? selfAnalysisFen : currentFen} />}
                </div>
              </div>
            )}

            {/* ── Middle Column: Board ── */}
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-1 pb-8 space-y-3">
              <div className="flex flex-col gap-2 max-w-[700px] mx-auto w-full">
                {/* Player Black Banner */}
                <div className="flex items-center justify-between rounded-xl bg-zinc-800/60 backdrop-blur-md px-4 py-2 text-sm font-semibold text-zinc-100 shadow-sm border border-zinc-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">👤</span>
                    <span>{orientation === "white" ? (game?.metadata.black ?? "Black") : (game?.metadata.white ?? "White")}</span>
                  </div>
                </div>

                {/* Row containing Eval Bar and Chess Board */}
                <div className={`flex gap-2 transition-all duration-300 ${isPanelCollapsed ? "h-[360px] sm:h-[480px] md:h-[580px] lg:h-[620px]" : "h-[320px] sm:h-[400px] md:h-[480px] lg:h-[500px]"}`}>
                  <EvalBar
                    cp={currentEval?.evalAfter}
                    mate={currentEval?.mate}
                    turn={currentEval?.color}
                    orientation={orientation}
                    isAnalyzing={state.isAnalyzing}
                  />
                  <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden border border-zinc-800/60 shadow-2xl">
                    <ChessBoard
                      fen={isRetrying && retryBoardFen ? retryBoardFen : (isSelfAnalysis && selfAnalysisFen ? selfAnalysisFen : currentFen)}
                      lastMove={isRetrying || isSelfAnalysis ? undefined : lastMove}
                      interactive={isRetrying ? !retryFeedback?.success : true}
                      onMove={isRetrying ? handleRetryMove : handleSelfAnalysisMove}
                      heatmap={heatmap}
                      shapes={boardShapes}
                      orientation={orientation}
                      evalLabel={currentEval?.label}
                      theme={boardTheme}
                    />
                  </div>
                </div>

                {/* Player White Banner */}
                <div className="flex items-center justify-between rounded-xl bg-zinc-800/60 backdrop-blur-md px-4 py-2 text-sm font-semibold text-zinc-100 shadow-sm border border-zinc-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">GM</span>
                    <span>{orientation === "white" ? (game?.metadata.white ?? "White") : (game?.metadata.black ?? "Black")}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {/* Toggle Panel Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                      className="h-8 text-xs font-bold border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 px-3 flex items-center gap-1.5 shadow-sm transition-all duration-200"
                    >
                      {isPanelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {isPanelCollapsed ? "Mở rộng bảng" : "Thu gọn bảng"}
                    </Button>
                    {/* Board Theme Picker */}
                    <BoardThemePicker currentThemeId={boardTheme.id} onSelect={setBoardTheme} />
                  </div>
                </div>

                {isSelfAnalysis && (
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-2.5 flex flex-col gap-2 text-sm mt-1 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                          Chế độ Phân tích Tự do (Self Analysis)
                        </span>
                        <span className="text-muted-foreground text-[10px] mt-0.5 font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={selfAnalysisMoves.join(" → ")}>
                          Nhánh phụ: {selfAnalysisMoves.length > 0 ? selfAnalysisMoves.join(" → ") : "Kéo quân để đi thử"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="font-bold shrink-0 text-[10px] px-2.5 h-7 bg-red-650 hover:bg-red-500"
                        onClick={() => {
                          setIsSelfAnalysis(false);
                          setSelfAnalysisFen(null);
                          setSelfAnalysisMoves([]);
                        }}
                      >
                        Thoát phân tích
                      </Button>
                    </div>
                  </div>
                )}

                {currentEval && !state.isAnalyzing && (currentEval.label === "blunder" || currentEval.label === "mistake" || currentEval.label === "missed") && (
                  <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 flex flex-col gap-3 text-sm mt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-red-400 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Thử Thách Sửa Sai!</span>
                        <span className="text-muted-foreground text-xs mt-0.5 block">Nước đi thực tế ({currentEval.san}) là một lỗi. Bạn có thể tìm ra nước cờ tối ưu không?</span>
                      </div>
                      {!isRetrying ? (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-500 text-white font-bold shrink-0"
                          onClick={() => {
                            setIsRetrying(true);
                            setRetryBoardFen(retryStartFen);
                            setRetryFeedback(null);
                          }}
                        >
                          Sửa Sai (Retry)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground shrink-0 border border-border"
                          onClick={() => {
                            setIsRetrying(false);
                            setRetryFeedback(null);
                          }}
                        >
                          Hủy
                        </Button>
                      )}
                    </div>

                    {isRetrying && (
                      <div className="rounded border border-primary/20 bg-primary/10 p-2.5 flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary flex items-center gap-1.5 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Đang ở chế độ sửa sai. Hãy di chuyển quân cờ trên bàn!
                          </span>
                        </div>
                        {retryFeedback && (
                          <div className={`p-2 rounded font-semibold ${retryFeedback.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                            {retryFeedback.text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <BoardControls
                    ply={currentPly}
                    total={totalPlies}
                    heatmap={heatmap}
                    onHeatmapChange={setHeatmap}
                    multiPv={multiPvEnabled}
                    onMultiPvChange={setMultiPvEnabled}
                    onFirst={() => goToPly(0)}
                    onPrev={() => goToPly(currentPly - 1)}
                    onNext={() => goToPly(currentPly + 1)}
                    onLast={() => goToPly(totalPlies)}
                    isPlaying={isPlaying}
                    onPlayToggle={() => setIsPlaying(!isPlaying)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
                  className="h-10 px-3 shrink-0"
                  title="Flip board orientation"
                >
                  🔄 Flip
                </Button>
              </div>

              {/* Syzygy tablebase — auto-renders when ≤7 pieces remain */}
              <SyzygyBadge fen={currentFen} />

              {/* Candidate lines (Multi-PV) table */}
              <LiveLinesTable
                lines={liveLines}
                isThinking={isLiveThinking}
                enabled={multiPvEnabled}
              />

              {/* Continue vs Stockfish — shown when on last ply of a resigned game */}
              {isResignation && currentPly === totalPlies && (
                <>
                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
                    <span className="font-semibold capitalize">{resignedSide}</span> resigned here.
                    Want to see how it would have ended?
                  </div>
                  <Button
                    id="continue-vs-stockfish-btn"
                    className="w-full bg-primary/90 hover:bg-primary"
                    onClick={() => setShowContinue(true)}
                  >
                    <Swords className="mr-2 h-4 w-4" />
                    Continue vs Stockfish
                  </Button>
                </>
              )}

              {/* Mobile sheet trigger */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary" className="w-full">
                      <PanelRightOpen className="mr-2 h-4 w-4" />
                      Open analysis
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] overflow-auto p-4">
                    <AnalysisPanel
                      game={game}
                      state={state}
                      currentPly={currentPly}
                      currentFen={currentFen}
                      gameHash={hash}
                      onPlyClick={setCurrentPly}
                      onCancel={cancel}
                      whitePlayerName={game?.metadata.white ?? "White"}
                      blackPlayerName={game?.metadata.black ?? "Black"}
                      isSelfAnalysis={isSelfAnalysis}
                      selfAnalysisFen={selfAnalysisFen}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* ── Right: Analysis (desktop) ── */}
            {!isPanelCollapsed && (
              <div className="hidden lg:block animate-fade-in-up">
                <AnalysisPanel
                  game={game}
                  state={state}
                  currentPly={currentPly}
                  currentFen={currentFen}
                  gameHash={hash}
                  onPlyClick={setCurrentPly}
                  onCancel={cancel}
                  whitePlayerName={game?.metadata.white ?? "White"}
                  blackPlayerName={game?.metadata.black ?? "Black"}
                  isSelfAnalysis={isSelfAnalysis}
                  selfAnalysisFen={selfAnalysisFen}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue vs Stockfish modal (Sheet) */}
      <Sheet open={showContinue} onOpenChange={setShowContinue}>
        <SheetContent
          side="right"
          className="w-full overflow-auto p-4 sm:max-w-md"
        >
          {showContinue && (
            <ContinueVsStockfish
              finalFen={finalFen}
              resignedSide={resignedSide}
              userElo={game?.metadata.whiteElo ?? game?.metadata.blackElo ?? null}
              onClose={() => setShowContinue(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      <BottomBar pgn={pgn} accuracyWhite={state.accuracyWhite} accuracyBlack={state.accuracyBlack} />
    </div>
  );
}
