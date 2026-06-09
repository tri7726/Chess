import type { LabelCounts } from "@/features/analysis/lib/move-labels";

interface StatsTableProps {
  white?: LabelCounts;
  black?: LabelCounts;
  accuracyWhite?: number | null;
  accuracyBlack?: number | null;
  whitePlayerName?: string;
  blackPlayerName?: string;
  whiteElo?: number | null;
  blackElo?: number | null;
}

const EMPTY: LabelCounts = {
  brilliant: 0, great: 0, best: 0, excellent: 0,
  good: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, theory: 0,
  missed: 0, forced: 0,
};

function getEloColorClass(elo: number, isDarkBg: boolean) {
  if (elo < 1200) return isDarkBg ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-amber-700 bg-amber-700/10 border-amber-700/20"; // Bronze
  if (elo < 1600) return isDarkBg ? "text-zinc-300 bg-zinc-500/10 border-zinc-500/20" : "text-zinc-600 bg-zinc-600/10 border-zinc-600/20"; // Silver
  if (elo < 2000) return isDarkBg ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" : "text-yellow-600 bg-yellow-600/10 border-yellow-600/20"; // Gold
  if (elo < 2400) return isDarkBg ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-600 bg-emerald-600/10 border-emerald-600/20"; // Emerald
  return isDarkBg ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 font-bold" : "text-cyan-600 bg-cyan-600/10 border-cyan-600/20 font-bold"; // Master
}

const LABELS_CONFIG = [
  { key: "brilliant",  name: "Brilliant",  symbol: "!!", colorClass: "bg-cyan-500 text-white" },
  { key: "great",      name: "Great",      symbol: "!",  colorClass: "bg-indigo-600 text-white" },
  { key: "best",       name: "Best",       symbol: "★",  colorClass: "bg-emerald-600 text-white" },
  { key: "excellent",  name: "Excellent",  symbol: "👍", colorClass: "bg-green-600 text-white" },
  { key: "good",       name: "Good",       symbol: "✓",  colorClass: "bg-teal-600 text-white" },
  { key: "okay",       name: "Okay",       symbol: "✓",  colorClass: "bg-zinc-500 text-white" },
  { key: "forced",     name: "Forced",     symbol: "F",  colorClass: "bg-zinc-600 text-white" },
  { key: "theory",     name: "Theory",     symbol: "📖", colorClass: "bg-amber-800 text-white" },
  { key: "inaccuracy", name: "Inaccuracy", symbol: "?!", colorClass: "bg-amber-500 text-white" },
  { key: "mistake",    name: "Mistake",    symbol: "?",  colorClass: "bg-orange-500 text-white" },
  { key: "missed",     name: "Missed Win", symbol: "M",  colorClass: "bg-red-500 text-white" },
  { key: "blunder",    name: "Blunder",    symbol: "??", colorClass: "bg-red-600 text-white" },
] as const;

export function StatsTable({
  white = EMPTY,
  black = EMPTY,
  accuracyWhite,
  accuracyBlack,
  whitePlayerName = "White",
  blackPlayerName = "Black",
  whiteElo,
  blackElo,
}: StatsTableProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
      
      {/* 1. Header Title */}
      <div className="text-center font-semibold text-lg text-zinc-100">Accuracies & Elo Performance</div>

      {/* 2. Accuracies Boxes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-100 py-2.5 text-zinc-900 shadow-md">
          <span className="text-2xl font-extrabold font-mono leading-none">
            {accuracyWhite !== null && accuracyWhite !== undefined ? `${accuracyWhite}%` : "N/A"}
          </span>
          {accuracyWhite !== null && accuracyWhite !== undefined && whiteElo && (
            <span className={`mt-1.5 px-2 py-0.5 text-[9px] font-mono font-bold rounded border ${getEloColorClass(whiteElo, false)}`}>
              Performance ELO: {whiteElo}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 py-2.5 text-zinc-100 shadow-md">
          <span className="text-2xl font-extrabold font-mono leading-none">
            {accuracyBlack !== null && accuracyBlack !== undefined ? `${accuracyBlack}%` : "N/A"}
          </span>
          {accuracyBlack !== null && accuracyBlack !== undefined && blackElo && (
            <span className={`mt-1.5 px-2 py-0.5 text-[9px] font-mono font-bold rounded border ${getEloColorClass(blackElo, true)}`}>
              Performance ELO: {blackElo}
            </span>
          )}
        </div>
      </div>

      {/* 3. Player Names Columns */}
      <div className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-x-2 px-1 text-xs font-semibold text-zinc-400 border-b border-zinc-800 pb-2">
        <span className="text-left truncate max-w-[120px]" title={whitePlayerName}>{whitePlayerName}</span>
        <span className="text-center text-[10px] text-zinc-600">VS</span>
        <span className="text-right truncate max-w-[120px]" title={blackPlayerName}>{blackPlayerName}</span>
      </div>

      {/* 4. Label Count Rows with Circular Badge in the Middle */}
      <div className="space-y-2.5">
        {LABELS_CONFIG.map((l) => {
          const wCount = white[l.key] ?? 0;
          const bCount = black[l.key] ?? 0;

          return (
            <div
              key={l.key}
              className="grid grid-cols-[1fr_2rem_1fr] items-center gap-x-2 px-1 text-sm text-zinc-300 stats-row-hover rounded py-1"
            >
              {/* White Count (Left side) */}
              <div className="flex items-center gap-2 text-left">
                <span className="text-xs text-zinc-500 font-semibold">{l.name}</span>
                <span className={`font-mono font-bold ${wCount > 0 ? (l.key === 'blunder' || l.key === 'mistake' ? 'text-red-400 font-extrabold' : 'text-zinc-100') : 'text-zinc-600'}`}>
                  {wCount}
                </span>
              </div>

              {/* Central Badge */}
              <div className="flex justify-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold shadow-inner ${l.colorClass}`}>
                  {l.symbol}
                </div>
              </div>

              {/* Black Count (Right side) */}
              <div className="flex items-center gap-2 justify-end text-right">
                <span className={`font-mono font-bold ${bCount > 0 ? (l.key === 'blunder' || l.key === 'mistake' ? 'text-red-400 font-extrabold' : 'text-zinc-100') : 'text-zinc-600'}`}>
                  {bCount}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">{l.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
