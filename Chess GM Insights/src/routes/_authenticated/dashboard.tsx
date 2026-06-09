import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyGames } from "@/features/game/lib/games.functions";
import { Button } from "@/shared/components/ui/button";
import { UploadModal } from "@/shared/components/pgn/UploadModal";
import { Inbox, Upload, BarChart2, Shield, Swords, Trophy, Activity, Brain, RefreshCw } from "lucide-react";
import { hashPgn } from "@/features/game/lib/pgn-samples";
import { useMemo, useState } from "react";
import { loadCards } from "@/features/training/lib/sm2";
import { BlunderPhaseChart } from "@/features/analysis/components/BlunderPhaseChart";
import { useAuth } from "@/hooks/use-auth";
import { saveGame } from "@/features/game/lib/games.functions";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — V-Max" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchGames = useServerFn(listMyGames);
  const save = useServerFn(saveGame);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-games"],
    queryFn: () => fetchGames(),
  });

  const serverGames = data?.games ?? [];

  // Read local games
  const localGames = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("vmax:local_games") || "[]");
    } catch {
      return [];
    }
  }, [data]);

  // Merge games: local games take priority
  const games = useMemo(() => {
    const merged = [...localGames];
    serverGames.forEach((sg) => {
      const sgHash = sg.white_name + sg.black_name + sg.date + sg.pgn.slice(0, 50);
      const exists = localGames.some((lg: any) => lg.hash === sgHash || lg.pgn === sg.pgn);
      if (!exists) {
        merged.push({
          ...sg,
          isLocal: false,
        });
      }
    });
    return merged.sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());
  }, [localGames, serverGames]);

  async function handleSync() {
    if (!user) {
      toast.error("Please sign in to sync your local games");
      return;
    }
    if (localGames.length === 0) return;
    setSyncing(true);
    let successCount = 0;
    try {
      for (const lg of localGames) {
        await save({ data: { pgn: lg.pgn } });
        successCount++;
      }
      localStorage.removeItem("vmax:local_games");
      toast.success(`Successfully synced ${successCount} offline games to cloud!`);
      queryClient.invalidateQueries({ queryKey: ["my-games"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
      const remaining = localGames.slice(successCount);
      localStorage.setItem("vmax:local_games", JSON.stringify(remaining));
      queryClient.invalidateQueries({ queryKey: ["my-games"] });
    } finally {
      setSyncing(false);
    }
  }

  const aiCoachStats = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("ai_coach_stats");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      
      const totalCalls = parsed.length;
      const totalTokens = parsed.reduce((sum, item) => sum + (item.tokens || 0), 0);
      const totalLatency = parsed.reduce((sum, item) => sum + (item.latency || 0), 0);
      const avgLatency = Math.round(totalLatency / totalCalls);
      
      const providers: Record<string, number> = {};
      parsed.forEach((item) => {
        const prov = item.provider || "UNKNOWN";
        providers[prov] = (providers[prov] || 0) + 1;
      });

      const costSaved = (totalTokens * 0.000015).toFixed(4);

      return {
        totalCalls,
        totalTokens,
        avgLatency,
        providers,
        costSaved,
      };
    } catch {
      return null;
    }
  }, [games]);

  const allMistakes = useMemo(() => {
    const cards = loadCards();
    return cards.map((c) => {
      const parts = c.fen.split(" ");
      const activeColor = parts[1] ?? "w";
      // Fullmove number is typically the 6th field (index 5)
      // e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
      let fullMove = parseInt(parts[5] ?? "1");
      if (isNaN(fullMove)) fullMove = 1;
      const ply = activeColor === "w" ? (fullMove - 1) * 2 + 1 : fullMove * 2;
      return { ply, label: c.theme === "blunder_recovery" ? "blunder" : "mistake" };
    });
  }, [games]);

  // Compute insights
  const stats = useMemo(() => {
    if (games.length === 0) return null;

    let totalWhiteAcc = 0;
    let whiteAccCount = 0;
    let totalBlackAcc = 0;
    let blackAccCount = 0;

    let whiteWins = 0;
    let blackWins = 0;
    let draws = 0;

    const openings: Record<string, number> = {};

    games.forEach((g) => {
      if (typeof g.accuracy_white === "number") {
        totalWhiteAcc += g.accuracy_white;
        whiteAccCount++;
      }
      if (typeof g.accuracy_black === "number") {
        totalBlackAcc += g.accuracy_black;
        blackAccCount++;
      }

      if (g.result === "1-0") whiteWins++;
      else if (g.result === "0-1") blackWins++;
      else if (g.result === "1/2-1/2") draws++;

      if (g.opening_name) {
        openings[g.opening_name] = (openings[g.opening_name] || 0) + 1;
      }
    });

    const avgWhiteAcc = whiteAccCount > 0 ? Math.round(totalWhiteAcc / whiteAccCount) : null;
    const avgBlackAcc = blackAccCount > 0 ? Math.round(totalBlackAcc / blackAccCount) : null;

    let topOpening = "Unknown";
    let maxCount = 0;
    Object.entries(openings).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topOpening = name;
      }
    });

    // Make chart data
    const chartData = [...games]
      .reverse() // sequential chronological order
      .map((g, idx) => ({
        index: idx + 1,
        whiteAcc: g.accuracy_white ?? null,
        blackAcc: g.accuracy_black ?? null,
        label: `${g.white_name?.slice(0, 8)} vs ${g.black_name?.slice(0, 8)}`,
      }));

    return {
      avgWhiteAcc,
      avgBlackAcc,
      whiteWins,
      blackWins,
      draws,
      topOpening,
      chartData,
    };
  }, [games]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Insights Dashboard</h1>
          <p className="text-sm text-muted-foreground">Detailed overview of your analyzed chess library.</p>
        </div>
        <div className="flex gap-2">
          {user && localGames.length > 0 && (
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Offline Games ({localGames.length})
            </Button>
          )}
          <UploadModal
            trigger={
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading dashboard analytics…
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No games yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload your first game to generate statistical insights.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Games</p>
                <h3 className="text-xl font-bold">{games.length}</h3>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="p-2.5 bg-green-500/10 text-green-400 rounded-lg">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Win Distribution</p>
                <h3 className="text-sm font-bold text-foreground">
                  W: {stats?.whiteWins} | B: {stats?.blackWins} | D: {stats?.draws}
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Avg Accuracies</p>
                <h3 className="text-sm font-bold text-foreground">
                  ⬜ {stats?.avgWhiteAcc}% | ⬛ {stats?.avgBlackAcc}%
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Swords className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase truncate">Favorite Opening</p>
                <h3 className="text-xs font-bold text-foreground truncate" title={stats?.topOpening}>
                  {stats?.topOpening}
                </h3>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          {stats && stats.chartData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
              {/* Accuracy Trend Chart */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" /> Accuracy Trends Over Games
                </h2>
                <div className="h-60 w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.03 285)" />
                      <XAxis dataKey="index" stroke="oklch(0.7 0.02 285)" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="oklch(0.7 0.02 285)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.245 0.04 285)",
                          border: "1px solid oklch(0.32 0.03 285)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="whiteAcc"
                        name="White Accuracy"
                        stroke="oklch(0.9 0.02 285)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="blackAcc"
                        name="Black Accuracy"
                        stroke="oklch(0.553 0.243 297)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Blunder Phase Distribution */}
              <div className="flex flex-col justify-stretch">
                <BlunderPhaseChart mistakes={allMistakes} />
              </div>
            </div>
          )}

          {/* AI Coach Metrics Section */}
          {aiCoachStats && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                AI Coach Audit Metrics (Key Pool & Cost Tracker)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Tổng số cuộc gọi (Calls)</div>
                  <div className="text-lg font-bold text-foreground font-mono mt-1">{aiCoachStats.totalCalls}</div>
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Độ trễ trung bình</div>
                  <div className="text-lg font-bold text-foreground font-mono mt-1">{aiCoachStats.avgLatency}ms</div>
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Token tiêu thụ</div>
                  <div className="text-lg font-bold text-foreground font-mono mt-1">{aiCoachStats.totalTokens}</div>
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Chi phí tiết kiệm (Est. USD)</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">${aiCoachStats.costSaved}</div>
                </div>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <div className="text-xs text-muted-foreground flex justify-between font-mono">
                  <span>Phân phối nhà cung cấp (Key Pool & Fallback Distribution):</span>
                  <span>
                    {Object.entries(aiCoachStats.providers).map(([prov, count]) => `${prov}: ${count}`).join(" | ")}
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-zinc-800 overflow-hidden flex">
                  {Object.entries(aiCoachStats.providers).map(([prov, count], idx) => {
                    const pct = (count / aiCoachStats.totalCalls) * 100;
                    const colors = ["bg-indigo-600", "bg-cyan-500", "bg-zinc-650"];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={prov}
                        className={`${color} h-full`}
                        style={{ width: `${pct}%` }}
                        title={`${prov}: ${count} (${pct.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Game List Table */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Saved Game Database</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">White</th>
                    <th className="px-4 py-3">Black</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3">Opening</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const hash = hashPgn(g.pgn);
                    return (
                      <tr key={g.id} className="border-t border-border/60 hover:bg-muted/20 transition-all">
                        <td className="px-4 py-3 font-mono text-xs">{g.date ?? "—"}</td>
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <span>{g.white_name ?? "—"}</span>
                          {g.isLocal && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded shrink-0">
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{g.black_name ?? "—"}</td>
                        <td className="px-4 py-3 font-mono">{g.result ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          ⬜ {g.accuracy_white ?? "—"}% | ⬛ {g.accuracy_black ?? "—"}%
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {g.opening_eco ? <span className="mr-1 font-mono text-xs text-primary bg-primary/10 px-1 rounded">{g.opening_eco}</span> : null}
                          {g.opening_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/game/$hash" params={{ hash }} onClick={() => sessionStorage.setItem(`vmax:pgn:${hash}`, g.pgn)}>
                              Open Analysis
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

