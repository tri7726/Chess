import { useState, useEffect } from "react";
import { explainMove, type CoachResponse } from "../lib/coach.functions";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Loader2, Brain, Zap, Sparkles, AlertCircle } from "lucide-react";
import { playChessSound } from "@/shared/lib/sound";

function TypewriterText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    const words = text.split(" ");
    let index = 0;
    const timer = setInterval(() => {
      if (index < words.length) {
        setDisplayed((prev) => (prev ? prev + " " + words[index] : words[index]));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span className="transition-all duration-200">{displayed}</span>;
}

interface AICoachCardProps {
  currentPly: number;
  fen: string;
  san: string;
  label: string;
  delta: number;
  bestMove: string;
  context?: string;
}

export function AICoachCard({
  currentPly,
  fen,
  san,
  label,
  delta,
  bestMove,
  context,
}: AICoachCardProps) {
  const [cache, setCache] = useState<Record<number, CoachResponse>>({});
  const [loadingPly, setLoadingPly] = useState<number | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when changing plys
  useEffect(() => {
    setError(null);
  }, [currentPly]);

  const handleAskCoach = async () => {
    if (loadingPly !== null) return;
    setLoadingPly(currentPly);
    setError(null);

    // Play coach chime sound if available
    try {
      playChessSound("brilliant");
    } catch {}

    try {
      const res = await explainMove({
        data: {
          fen,
          userMove: san,
          bestMove,
          label,
          delta,
          context,
          turboMode,
        },
      });

      setCache((prev) => ({
        ...prev,
        [currentPly]: res,
      }));

      // Log statistics to localStorage for Dashboard audit
      const stats = JSON.parse(localStorage.getItem("ai_coach_stats") || "[]");
      stats.push({
        timestamp: Date.now(),
        provider: res.provider,
        tokens: res.tokensUsed || 0,
        latency: res.latencyMs,
        ply: currentPly,
      });
      localStorage.setItem("ai_coach_stats", JSON.stringify(stats));

    } catch (err) {
      console.error("Coach error:", err);
      setError("Không thể kết nối với Huấn luyện viên AI. Hãy thử lại sau.");
    } finally {
      setLoadingPly(null);
    }
  };

  const response = cache[currentPly];
  const isLoading = loadingPly === currentPly;

  // Render proper Vietnamese move assessment labels
  const getMoveLabelText = (lbl: string) => {
    switch (lbl) {
      case "brilliant": return "Thiên tài (Brilliant)";
      case "great": return "Xuất sắc (Great)";
      case "best": return "Tốt nhất (Best)";
      case "excellent": return "Rất tốt (Excellent)";
      case "good": return "Tốt (Good)";
      case "okay": return "Tạm được (Okay)";
      case "forced": return "Bắt buộc (Forced)";
      case "theory": return "Lý thuyết (Theory)";
      case "inaccuracy": return "Sai số (Inaccuracy)";
      case "mistake": return "Sai lầm (Mistake)";
      case "missed": return "Bỏ lỡ thắng (Missed Win)";
      case "blunder": return "Lỗi nặng (Blunder)";
      default: return lbl;
    }
  };

  const getCardStyleClass = (lbl: string) => {
    switch (lbl) {
      case "brilliant":
        return "shadow-[0_0_25px_rgba(6,182,212,0.22)] border-cyan-500/50 animate-pulse-subtle";
      case "great":
        return "shadow-[0_0_20px_rgba(79,70,229,0.18)] border-indigo-500/40";
      case "missed":
        return "shadow-[0_0_22px_rgba(239,68,68,0.2)] border-red-500/45 animate-shake";
      case "blunder":
        return "shadow-[0_0_28px_rgba(220,38,38,0.25)] border-red-600/50 animate-shake";
      case "mistake":
        return "shadow-[0_0_15px_rgba(249,115,22,0.15)] border-orange-500/40";
      case "theory":
        return "shadow-[0_0_15px_rgba(180,83,9,0.15)] border-amber-700/40";
      default:
        return "border-zinc-800";
    }
  };

  return (
    <Card
      key={currentPly}
      className={`relative overflow-hidden bg-zinc-950/80 backdrop-blur-md text-zinc-100 transition-all duration-300 border animate-fade-in-up ${getCardStyleClass(label)}`}
    >
      {/* Sleek top glowing border for premium feel */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500" />
      
      <CardContent className="p-4 space-y-4">
        {/* Header with cool avatar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Brain className="h-5 w-5 animate-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wide text-zinc-100 flex items-center gap-1.5">
                AI Grandmaster Coach
                <Sparkles className="h-3 w-3 text-yellow-400" />
              </h4>
              <p className="text-[10px] text-zinc-400 font-mono">Đại kiện tướng trợ lý ảo</p>
            </div>
          </div>

          {/* Turbo Mode Switch */}
          <div className="flex items-center gap-2 bg-zinc-900/60 px-2 py-1 rounded-md border border-zinc-800/80">
            <Zap className={`h-3 w-3 ${turboMode ? 'text-yellow-400 fill-yellow-400/20' : 'text-zinc-500'}`} />
            <span className="text-[10px] font-semibold text-zinc-400 select-none">Turbo</span>
            <Switch
              id="turbo-mode"
              checked={turboMode}
              onCheckedChange={setTurboMode}
              className="scale-75"
            />
          </div>
        </div>

        {/* Selected move banner */}
        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800/60 p-2.5 flex justify-between items-center text-xs">
          <div>
            <span className="text-zinc-500">Nước cờ: </span>
            <span className="font-mono font-bold text-zinc-200 bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-800">{san}</span>
          </div>
          <div>
            <span className="text-zinc-500">Đánh giá: </span>
            <span className="font-bold text-indigo-400">{getMoveLabelText(label)}</span>
          </div>
        </div>

        {/* Explanation Area */}
        <div className="min-h-[70px] flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-3 space-y-2 text-zinc-400 text-xs">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              <span className="font-mono text-[10px] animate-pulse">
                {turboMode ? "Chế độ đua song song (Groq ⚡ Gemini) đang chạy..." : "Đang phân tích nước cờ..."}
              </span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-lg p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : response ? (
            <div className="space-y-3 animate-fade-in">
              {/* Concept badge */}
              <div className="flex">
                <span className="inline-flex items-center gap-1 rounded bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  <Brain className="h-2.5 w-2.5" />
                  {response.concept}
                </span>
              </div>
              
              {/* Explanation text */}
              <p className="text-xs leading-relaxed text-zinc-300 font-sans">
                <TypewriterText text={response.explanation} />
              </p>

              {/* API Metadata */}
              <div className="flex justify-between items-center border-t border-zinc-900 pt-2 text-[9px] font-mono text-zinc-500">
                <span>Trực quan: {response.provider}</span>
                <span>Độ trễ: {response.latencyMs}ms</span>
                {response.tokensUsed ? <span>Tokens: {response.tokensUsed}</span> : null}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-xs text-zinc-400">
                Bạn muốn biết tại sao nước đi {san} lại được đánh giá như vậy và ý đồ chiến thuật là gì?
              </p>
              <Button
                size="sm"
                onClick={handleAskCoach}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-none shadow-md font-bold text-xs"
              >
                🤖 Hỏi Đại kiện tướng Coach
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
