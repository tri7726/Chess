import { useState, lazy, Suspense } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  useStockfishPlay,
  type Difficulty,
  type PlayerColor,
} from "@/features/continue-play/hooks/useStockfishPlay";
import { Bot, Trophy, Handshake, Swords, Loader2, RotateCcw, Flag } from "lucide-react";

const ChessBoard = lazy(() =>
  import("@/shared/components/board/ChessBoard").then((m) => ({ default: m.ChessBoard })),
);

function EvalBar({ cp, mateIn }: { cp: number; mateIn: number | null }) {
  const wp = mateIn !== null
    ? (mateIn > 0 ? 100 : 0)
    : Math.round((1 / (1 + Math.exp(-0.00368208 * cp))) * 100);
  const label = mateIn !== null
    ? `M${Math.abs(mateIn)}`
    : `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="absolute inset-y-0 left-0 bg-white transition-all duration-500" style={{ width: `${wp}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  );
}

function MiniMoveList({ history }: { history: { san: string; color: "w" | "b" }[] }) {
  const pairs: { n: number; w?: string; b?: string }[] = [];
  let moveNum = 1;
  let i = 0;
  if (history.length > 0 && history[0].color === "b") {
    pairs.push({ n: moveNum++, b: history[0].san });
    i = 1;
  }
  while (i < history.length) {
    const entry: { n: number; w?: string; b?: string } = { n: moveNum++ };
    if (i < history.length && history[i].color === "w") entry.w = history[i++].san;
    if (i < history.length && history[i].color === "b") entry.b = history[i++].san;
    pairs.push(entry);
  }
  if (pairs.length === 0) {
    return <p className="text-center text-xs italic text-muted-foreground py-4">No moves yet…</p>;
  }
  return (
    <ScrollArea className="h-48 rounded-lg border border-border bg-card/60 p-2">
      <div className="space-y-0.5">
        {pairs.map((p) => (
          <div key={p.n} className="grid grid-cols-[24px_1fr_1fr] gap-1 text-xs font-mono">
            <span className="text-muted-foreground">{p.n}.</span>
            <span className="rounded px-1 text-foreground">{p.w ?? ""}</span>
            <span className="rounded px-1 text-foreground">{p.b ?? ""}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface SetupScreenProps {
  resignedSide: "white" | "black";
  onStart: (side: PlayerColor, diff: Difficulty) => void;
  onClose: () => void;
}

function SetupScreen({ resignedSide, onStart, onClose }: SetupScreenProps) {
  const [side, setSide] = useState<PlayerColor>(resignedSide);
  const [diff, setDiff] = useState<Difficulty>("medium");

  const DIFFICULTIES: { key: Difficulty; label: string; desc: string; color: string }[] = [
    { key: "adaptive", label: "Adaptive", desc: "Matches your ELO + 150", color: "text-blue-400" },
    { key: "easy",     label: "Easy",     desc: "Depth 4 · ~1200 ELO",    color: "text-emerald-400" },
    { key: "medium",   label: "Medium",   desc: "Depth 10 · ~2000 ELO",   color: "text-yellow-400"  },
    { key: "hard",     label: "Hard",     desc: "Depth 18 · Full power",  color: "text-red-400"     },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Swords className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Continue vs Stockfish</h2>
          <p className="text-xs text-muted-foreground">
            Pick up where <span className="capitalize text-foreground">{resignedSide}</span> resigned
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Play as</p>
        <div className="grid grid-cols-2 gap-2">
          {(["white", "black"] as PlayerColor[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                side === s ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-3xl">{s === "white" ? "♔" : "♚"}</span>
              <span className="text-sm font-medium capitalize">{s}</span>
              {s === resignedSide && (
                <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-300 text-[10px]">Resigned</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Engine difficulty</p>
        <div className="space-y-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDiff(d.key)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-all ${
                diff === d.key ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className={`font-medium ${d.color}`}>{d.label}</span>
              <span className="text-xs text-muted-foreground">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={() => onStart(side, diff)}>
          <Swords className="mr-2 h-4 w-4" />Start
        </Button>
      </div>
    </div>
  );
}

interface GameScreenProps {
  initialFen: string;
  playerColor: PlayerColor;
  difficulty: Difficulty;
  resignedSide: "white" | "black";
  userElo?: number | null;
  onReset: () => void;
  onClose: () => void;
}

function GameScreen({ initialFen, playerColor, difficulty, resignedSide, userElo, onReset, onClose }: GameScreenProps) {
  const { state, makePlayerMove, resign } = useStockfishPlay(initialFen, playerColor, difficulty, userElo);
  const orientation = playerColor;

  const isMyTurn =
    (playerColor === "white" && state.turnColor === "w") ||
    (playerColor === "black" && state.turnColor === "b");

  const DIFF_COLOR: Record<Difficulty, string> = {
    adaptive: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    easy:     "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    medium:   "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    hard:     "border-red-500/40 bg-red-500/10 text-red-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">vs Stockfish</span>
          <Badge variant="outline" className={`capitalize text-[10px] ${DIFF_COLOR[difficulty]}`}>{difficulty}</Badge>
        </div>
        {state.isEngineThinking && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />Engine thinking…
          </span>
        )}
        {!state.isEngineThinking && !state.gameResult && (
          <span className="text-xs text-muted-foreground">{isMyTurn ? "⬜ Your turn" : "⬛ Engine's turn"}</span>
        )}
      </div>

      <EvalBar cp={state.evalCp} mateIn={state.mateIn} />

      <div className="relative">
        <Suspense fallback={<div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />}>
          <ChessBoard
            fen={state.fen}
            orientation={orientation}
            lastMove={state.lastMove}
            interactive={!state.gameResult && isMyTurn}
            onMove={(orig, dest) => makePlayerMove(orig, dest)}
          />
        </Suspense>

        {state.gameResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              {state.gameResult === "player_wins" && <Trophy className="h-12 w-12 text-yellow-400" />}
              {state.gameResult === "engine_wins" && <Bot className="h-12 w-12 text-red-400" />}
              {state.gameResult === "draw" && <Handshake className="h-12 w-12 text-zinc-400" />}
              <div>
                <p className="text-xl font-bold text-white">
                  {state.gameResult === "player_wins" && "You won! 🎉"}
                  {state.gameResult === "engine_wins" && "Engine wins"}
                  {state.gameResult === "draw" && "It's a draw"}
                </p>
                <p className="mt-1 text-sm text-zinc-300">{state.resultReason}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onReset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Play again
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
          📋 Continuing from where <span className="font-semibold capitalize">{resignedSide}</span> resigned.
          You are playing as <span className="font-semibold capitalize">{playerColor}</span>.
        </div>
        <MiniMoveList history={state.history} />
        {!state.gameResult && (
          <Button variant="outline" size="sm" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={resign}>
            <Flag className="mr-1.5 h-3.5 w-3.5" />Resign
          </Button>
        )}
      </div>
    </div>
  );
}

interface ContinueVsStockfishProps {
  finalFen: string;
  resignedSide: "white" | "black";
  userElo?: number | null;
  onClose: () => void;
}

export function ContinueVsStockfish({ finalFen, resignedSide, userElo, onClose }: ContinueVsStockfishProps) {
  const [started, setStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<PlayerColor>(resignedSide);
  const [difficulty, setDifficulty] = useState<Difficulty>("adaptive");
  const [gameKey, setGameKey] = useState(0);

  function handleStart(side: PlayerColor, diff: Difficulty) {
    setPlayerColor(side);
    setDifficulty(diff);
    setStarted(true);
  }

  function handleReset() {
    setGameKey((k) => k + 1);
    setStarted(false);
  }

  if (!started) {
    return <SetupScreen resignedSide={resignedSide} onStart={handleStart} onClose={onClose} />;
  }

  return (
    <GameScreen
      key={gameKey}
      initialFen={finalFen}
      playerColor={playerColor}
      difficulty={difficulty}
      resignedSide={resignedSide}
      userElo={userElo}
      onReset={handleReset}
      onClose={onClose}
    />
  );
}
