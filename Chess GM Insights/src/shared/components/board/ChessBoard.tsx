import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
// CSS moved to src/styles.css to avoid SSR crash

interface ChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: [string, string];
  heatmap?: boolean;
  interactive?: boolean;
  shapes?: { orig: string; dest?: string; brush: string }[];
  onSquareClick?: (square: string) => void;
  onMove?: (orig: string, dest: string) => void;
  evalLabel?: string;
  theme?: { boardCss: string; pieceCss: string };
}

const BADGE_CONFIGS: Record<string, { symbol: string; bgClass: string; squareClass: string }> = {
  brilliant:  { symbol: "!!", bgClass: "bg-cyan-500 text-white",     squareClass: "highlight-brilliant" },
  great:      { symbol: "!",  bgClass: "bg-indigo-600 text-white",    squareClass: "highlight-great" },
  best:       { symbol: "★",  bgClass: "bg-emerald-600 text-white",   squareClass: "highlight-best" },
  excellent:  { symbol: "👍", bgClass: "bg-green-600 text-white",     squareClass: "highlight-excellent" },
  good:       { symbol: "✓",  bgClass: "bg-teal-600 text-white",      squareClass: "highlight-good" },
  okay:       { symbol: "✓",  bgClass: "bg-zinc-500 text-white",      squareClass: "highlight-okay" },
  forced:     { symbol: "F",  bgClass: "bg-zinc-600 text-white",      squareClass: "highlight-forced" },
  inaccuracy: { symbol: "?!", bgClass: "bg-amber-500 text-white",     squareClass: "highlight-inaccuracy" },
  mistake:    { symbol: "?",  bgClass: "bg-orange-500 text-white",    squareClass: "highlight-mistake" },
  missed:     { symbol: "M",  bgClass: "bg-red-500 text-white",       squareClass: "highlight-missed" },
  blunder:    { symbol: "??", bgClass: "bg-red-600 text-white",       squareClass: "highlight-blunder" },
  theory:     { symbol: "📖", bgClass: "bg-amber-800 text-white",     squareClass: "highlight-theory" },
};

export function ChessBoard({
  fen,
  orientation = "white",
  lastMove,
  interactive = false,
  shapes = [],
  onSquareClick,
  onMove,
  evalLabel,
  theme = { boardCss: "cg-board-brown", pieceCss: "cg-piece-cburnett" },
}: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Config = {
      fen,
      orientation,
      movable: { 
        free: false, 
        color: interactive ? (fen.split(" ")[1] === "w" ? "white" : "black") : undefined,
        events: { after: onMove },
      },
      draggable: { enabled: interactive },
      selectable: { enabled: interactive },
      drawable: { enabled: true, autoShapes: shapes as any },
      lastMove: lastMove as any,
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 200 },
      events: { select: onSquareClick },
    };

    cgRef.current = Chessground(containerRef.current, config);

    return () => {
      cgRef.current?.destroy();
      cgRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cgRef.current) return;
    cgRef.current.set({
      fen,
      lastMove: lastMove as any,
      orientation,
      movable: {
        color: interactive ? (fen.split(" ")[1] === "w" ? "white" : "black") : undefined,
      },
      drawable: { enabled: true, autoShapes: shapes as any },
      turnColor: fen.split(" ")[1] === "w" ? "white" : "black",
    });
  }, [fen, lastMove, orientation, interactive, shapes]);

  // Removed the brittle DOM manipulation useEffect

  function getSquareStyle(square: string, boardOrientation: "white" | "black") {
    if (!square || square.length !== 2) return { left: "0%", top: "0%" };
    const file = square.charCodeAt(0) - 97; // 'a' -> 0
    const rank = parseInt(square[1], 10) - 1; // '1' -> 0

    const x = boardOrientation === "white" ? file : 7 - file;
    const y = boardOrientation === "white" ? 7 - rank : rank;

    return { left: `${(x / 8) * 100}%`, top: `${(y / 8) * 100}%` };
  }

  const activeBadge = lastMove && lastMove[1] && evalLabel ? BADGE_CONFIGS[evalLabel] : null;

  return (
    <div className="w-full relative">
      <div
        ref={containerRef}
        className={`aspect-square w-full overflow-hidden rounded-lg border border-border shadow-xl relative cg-wrap ${theme.boardCss} ${theme.pieceCss}`}
        style={{ minHeight: 240 }}
      >
        {/* Render badges natively in React over the board */}
        {activeBadge && lastMove && lastMove[1] && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              ...getSquareStyle(lastMove[1], orientation),
              width: "12.5%",
              height: "12.5%",
            }}
          >
            {/* Square highlight overlay */}
            <div className={`absolute inset-0 ${activeBadge.squareClass}`} />
            
            {/* Move classification badge */}
            <div
              className={`absolute top-0 right-0 flex h-[35%] w-[35%] translate-x-[20%] translate-y-[-20%] items-center justify-center rounded-full text-[10px] font-extrabold shadow-md animate-in fade-in zoom-in-50 duration-200 ${activeBadge.bgClass}`}
            >
              {activeBadge.symbol}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

