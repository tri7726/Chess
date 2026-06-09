import { useState, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ChessBoardPlaceholder } from "@/shared/components/board/ChessBoardPlaceholder";
import { ChessBoard } from "@/shared/components/board/ChessBoard";
import { getCardsForGame, reviewCard } from "@/features/training/lib/sm2";
import type { SM2Card } from "@/features/training/lib/sm2";
import { Chess } from "chess.js";
import { playChessSound } from "@/shared/lib/sound";
import { Flame, Lightbulb, RotateCcw, HelpCircle, Trophy, Sparkles } from "lucide-react";

const DIFF_COLOR: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Hard: "bg-red-500/15 text-red-300 border-red-500/30",
  blunder_recovery: "bg-red-500/15 text-red-300 border-red-500/30",
  mistake_fix: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export function TrainingTab({ gameHash }: { gameHash: string }) {
  const [puzzles, setPuzzles] = useState<SM2Card[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<SM2Card | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [currentFen, setCurrentFen] = useState<string>("");
  
  // Advanced features
  const [streak, setStreak] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [hintLevel, setHintLevel] = useState<number>(0); // 0 = none, 1 = show start sq, 2 = show dest sq
  const [revealSolution, setRevealSolution] = useState<boolean>(false);

  // Load streak from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vmax:puzzle:streak");
      if (stored) setStreak(parseInt(stored));
    }
  }, []);

  const saveStreak = (newStreak: number) => {
    setStreak(newStreak);
    if (typeof window !== "undefined") {
      localStorage.setItem("vmax:puzzle:streak", newStreak.toString());
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const loaded = getCardsForGame(gameHash);
      if (loaded.length > puzzles.length) {
        setPuzzles(loaded);
        if (!activePuzzle && loaded.length > 0) {
          selectPuzzle(loaded[0]);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameHash, puzzles.length, activePuzzle]);

  function selectPuzzle(p: SM2Card) {
    setActivePuzzle(p);
    setCurrentFen(p.fen);
    setFeedback(null);
    setAttempts(0);
    setHintLevel(0);
    setRevealSolution(false);
  }

  function handleSolveClick(p: SM2Card) {
    selectPuzzle(p);
  }

  function handleMove(orig: string, dest: string) {
    if (!activePuzzle) return;
    const uci = `${orig}${dest}`;
    const expected = activePuzzle.solution[0];

    const solutionPromotion = expected?.length === 5 ? expected[4] : "q";
    const isPromotion =
      (currentFen.split(" ")[1] === "w" && dest[1] === "8") ||
      (currentFen.split(" ")[1] === "b" && dest[1] === "1");
    const uciWithProm = isPromotion && uci.length === 4 ? `${uci}${solutionPromotion}` : uci;

    try {
      const chess = new Chess(currentFen);
      const move = chess.move({ from: orig, to: dest, promotion: solutionPromotion });
      
      if (move.san.includes("#")) {
        playChessSound("victory");
      } else if (move.san.includes("+")) {
        playChessSound("check");
      } else if (move.san.includes("x")) {
        playChessSound("capture");
      } else {
        playChessSound("move");
      }

      setCurrentFen(chess.fen());
    } catch {
      setFeedback({ text: "Invalid move rules.", success: false });
      setCurrentFen(currentFen);
      return;
    }

    if (uciWithProm === expected || uci === expected) {
      setFeedback({ text: "🎉 Correct! Excellent vision.", success: true });
      saveStreak(streak + 1);
      reviewCard(activePuzzle.id, 5);
      setPuzzles(getCardsForGame(gameHash));
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      saveStreak(0); // Reset streak on error

      setFeedback({
        text: `Incorrect move. Attempt ${newAttempts}/2`,
        success: false,
      });

      reviewCard(activePuzzle.id, 1);
      setPuzzles(getCardsForGame(gameHash));

      // Reset board back to start FEN if they got it wrong
      setTimeout(() => {
        if (!revealSolution) {
          setCurrentFen(activePuzzle.fen);
          setFeedback(null);
        }
      }, 1500);
    }
  }

  // Draw highlights or arrows based on Hint and Reveal state
  const shapes = useMemo(() => {
    if (!activePuzzle || activePuzzle.solution.length === 0) return [];
    const bestMove = activePuzzle.solution[0];
    const orig = bestMove.slice(0, 2);
    const dest = bestMove.slice(2, 4);

    const list: { orig: string; dest?: string; brush: string }[] = [];

    // Hint Level 1: Highlight start square in yellow
    if (hintLevel >= 1) {
      list.push({ orig, brush: "yellow" });
    }
    // Hint Level 2: Highlight destination square in green
    if (hintLevel >= 2) {
      list.push({ orig: dest, brush: "green" });
    }
    // Reveal Solution: Draw blue arrow
    if (revealSolution) {
      list.push({ orig, dest, brush: "blue" });
    }

    return list;
  }, [activePuzzle, hintLevel, revealSolution]);

  function triggerNextPuzzle() {
    const nextIdx = puzzles.findIndex((p) => p.id === activePuzzle?.id) + 1;
    if (nextIdx < puzzles.length) {
      selectPuzzle(puzzles[nextIdx]);
    } else if (puzzles.length > 0) {
      selectPuzzle(puzzles[0]); // loop back
    }
  }

  return (
    <div className="space-y-6">
      {/* Streak Dashboard Header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Solving Streak</h4>
            <p className="text-xs text-muted-foreground">Solve puzzles consecutively without failing twice.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-lg text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
          🔥 {streak}
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-primary" /> Generated Puzzles ({puzzles.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {puzzles.length === 0 ? (
            <p className="col-span-3 text-xs text-muted-foreground italic py-6 text-center border border-dashed rounded-lg border-border">
              No puzzles generated yet. Finish analyzing a game containing blunders or mistakes to train!
            </p>
          ) : (
            puzzles.map((p) => {
              const diffText = p.theme === "blunder_recovery" ? "Hard" : "Medium";
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border bg-card p-3 transition-all ${
                    activePuzzle?.id === p.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="outline" className={`${DIFF_COLOR[p.theme] ?? ""}`}>
                      {diffText}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">Rep: {p.repetition}</span>
                  </div>
                  <p className="mb-2 truncate font-mono text-[9px] text-muted-foreground" title={p.fen}>
                    {p.fen}
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs font-semibold"
                    variant={activePuzzle?.id === p.id ? "default" : "secondary"}
                    onClick={() => handleSolveClick(p)}
                  >
                    {activePuzzle?.id === p.id ? "Selected" : "Solve Puzzle"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Puzzle Arena
        </h3>
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          {activePuzzle ? (
            <div className="relative">
              <ChessBoard
                fen={currentFen}
                interactive={!feedback && !revealSolution}
                onMove={handleMove}
                shapes={shapes}
                orientation={activePuzzle.fen.split(" ")[1] === "w" ? "white" : "black"}
              />
            </div>
          ) : (
            <ChessBoardPlaceholder />
          )}

          <div className="flex flex-col justify-between gap-4">
            {activePuzzle ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Find the Best Continuation
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Play the best move for{" "}
                    <strong className="text-primary font-bold">
                      {activePuzzle.fen.split(" ")[1] === "w" ? "White" : "Black"}
                    </strong>.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty:</span>
                    <span className="font-bold text-foreground">
                      {activePuzzle.theme === "blunder_recovery" ? "🔴 Hard" : "🟡 Medium"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tactic Focus:</span>
                    <span className="font-mono text-foreground capitalize">
                      {activePuzzle.theme.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Feedback Panel */}
                {feedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium transition-all ${
                      feedback.success
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => setHintLevel((h) => Math.min(2, h + 1))}
                      disabled={feedback?.success || revealSolution || hintLevel >= 2}
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      {hintLevel === 0 ? "Get Hint" : hintLevel === 1 ? "Next Hint" : "No More Hints"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setCurrentFen(activePuzzle.fen);
                        setFeedback(null);
                        setHintLevel(0);
                        setRevealSolution(false);
                      }}
                      title="Reset position"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Show Solution when failed twice */}
                  {(attempts >= 2 || revealSolution) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full text-xs font-bold gap-1.5"
                      onClick={() => setRevealSolution(true)}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Reveal Solution
                    </Button>
                  )}

                  {/* Next Puzzle CTA when solved */}
                  {feedback?.success && (
                    <Button
                      className="w-full text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={triggerNextPuzzle}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Next Puzzle
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full space-y-2 py-8">
                <HelpCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Select a puzzle card above to load the interactive board.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
