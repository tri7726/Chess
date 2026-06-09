import { useState, useCallback } from "react";
import {
  Area, AreaChart, XAxis, YAxis, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, type TooltipProps,
  LineChart, Line,
} from "recharts";

const DUMMY = [-0.2, 0.5, 1.2, -3.0, -2.8].map((v, i) => ({ move: i + 1, eval: v, fen: "" }));

interface EvalPoint {
  move: number;
  eval: number;
  fen?: string;
}

// ─── Mini FEN board renderer (pure CSS, no chessground) ─────────────────────
const PIECE_SYMBOLS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function MiniFenBoard({ fen }: { fen: string }) {
  const position = fen.split(" ")[0];
  const rows = position.split("/");

  const squares: Array<{ piece: string | null; light: boolean }> = [];
  rows.forEach((row, rankIdx) => {
    let fileIdx = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) {
          squares.push({ piece: null, light: (rankIdx + fileIdx) % 2 === 0 });
          fileIdx++;
        }
      } else {
        squares.push({ piece: ch, light: (rankIdx + fileIdx) % 2 === 0 });
        fileIdx++;
      }
    }
  });

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: 96, height: 96 }}
      className="rounded overflow-hidden border border-zinc-700 shrink-0"
    >
      {squares.map((sq, i) => (
        <div
          key={i}
          style={{
            background: sq.light ? "#f0d9b5" : "#b58863",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            lineHeight: 1,
          }}
        >
          {sq.piece ? PIECE_SYMBOLS[sq.piece] ?? sq.piece : ""}
        </div>
      ))}
    </div>
  );
}

// ─── Custom Tooltip with mini board ─────────────────────────────────────────
function EvalTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const val: number = payload[0].value as number;
  const fen: string = (payload[0].payload as EvalPoint).fen ?? "";
  const sign = val > 0 ? "+" : "";
  const color = val > 0.5 ? "#34d399" : val < -0.5 ? "#f87171" : "#a1a1aa";

  return (
    <div
      style={{
        background: "oklch(0.18 0.04 285)",
        border: "1px solid oklch(0.32 0.03 285)",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        minWidth: 160,
      }}
    >
      {fen && <MiniFenBoard fen={fen} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ color: "#a1a1aa", fontSize: 10 }}>Nước {label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>
          {sign}{val.toFixed(2)}
        </span>
        <span style={{ color: "#71717a", fontSize: 9 }}>
          {val > 3 ? "Ưu thế áp đảo ⚡" : val > 1 ? "Ưu thế Trắng" : val < -3 ? "Ưu thế áp đảo ⚡" : val < -1 ? "Ưu thế Đen" : "Thế cân bằng ⚖️"}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function EvalChart({
  data = DUMMY,
  onMoveClick,
}: {
  data?: EvalPoint[];
  onMoveClick?: (ply: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const handleClick = useCallback(
    (e: any) => {
      if (e?.activePayload?.[0]?.payload?.move && onMoveClick) {
        onMoveClick(e.activePayload[0].payload.move);
      }
    },
    [onMoveClick],
  );

  return (
    <div className="h-52 w-full rounded-lg border border-border bg-card p-3 relative group">
      <p className="mb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Evaluation</span>
        {onMoveClick && (
          <span className="text-[9px] text-muted-foreground/50 italic">(Click to navigate)</span>
        )}
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
          onClick={handleClick}
          style={{ cursor: onMoveClick ? "pointer" : "default" }}
        >
          <defs>
            <linearGradient id="evalUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="evalDown" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f87171" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.03 285)" />
          <XAxis dataKey="move" stroke="oklch(0.7 0.02 285)" fontSize={10} />
          <YAxis stroke="oklch(0.7 0.02 285)" fontSize={10} domain={[-6, 6]} />
          <Tooltip content={<EvalTooltipContent />} />
          <ReferenceLine y={0} stroke="oklch(0.5 0.02 285)" strokeWidth={1.5} />
          <Area
            type="monotone"
            dataKey="eval"
            stroke="oklch(0.553 0.243 297)"
            fill="url(#evalUp)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "oklch(0.553 0.243 297)", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// kept for tree-shaken usage if any
export const LineChartStub = LineChart;
export const LineStub = Line;
