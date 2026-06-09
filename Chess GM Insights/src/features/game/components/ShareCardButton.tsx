import { useState, useRef, useCallback } from "react";
import { Share2, Download, Copy, Check, X } from "lucide-react";

const PIECE_SYMBOLS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

interface ShareCardProps {
  fen: string;
  whitePlayer?: string;
  blackPlayer?: string;
  accuracyWhite?: number | null;
  accuracyBlack?: number | null;
  result?: string; // "1-0" | "0-1" | "1/2-1/2"
  brilliantCountW?: number;
  brilliantCountB?: number;
  blunderCountW?: number;
  blunderCountB?: number;
  gameHash?: string;
}

function renderFenToCanvas(ctx: CanvasRenderingContext2D, fen: string, x: number, y: number, size: number) {
  const position = fen.split(" ")[0];
  const rows = position.split("/");
  const sq = size / 8;

  rows.forEach((row, rankIdx) => {
    let fileIdx = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) {
          const isLight = (rankIdx + fileIdx) % 2 === 0;
          ctx.fillStyle = isLight ? "#f0d9b5" : "#b58863";
          ctx.fillRect(x + fileIdx * sq, y + rankIdx * sq, sq, sq);
          fileIdx++;
        }
      } else {
        const isLight = (rankIdx + fileIdx) % 2 === 0;
        ctx.fillStyle = isLight ? "#f0d9b5" : "#b58863";
        ctx.fillRect(x + fileIdx * sq, y + rankIdx * sq, sq, sq);

        const symbol = PIECE_SYMBOLS[ch] ?? ch;
        ctx.font = `${sq * 0.75}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = ch === ch.toUpperCase() ? "#fff8f0" : "#1a1a1a";
        ctx.strokeStyle = ch === ch.toUpperCase() ? "#5a3a1a" : "#e0d0c0";
        ctx.lineWidth = 1;
        ctx.strokeText(symbol, x + fileIdx * sq + sq / 2, y + rankIdx * sq + sq / 2);
        ctx.fillText(symbol, x + fileIdx * sq + sq / 2, y + rankIdx * sq + sq / 2);
        fileIdx++;
      }
    }
  });
}

export function ShareCardButton({
  fen,
  whitePlayer = "White",
  blackPlayer = "Black",
  accuracyWhite,
  accuracyBlack,
  result = "*",
  brilliantCountW = 0,
  brilliantCountB = 0,
  blunderCountW = 0,
  blunderCountB = 0,
  gameHash = "",
}: ShareCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 600, H = 340;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f0c1e");
    grad.addColorStop(1, "#1a1235");
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 16);
    ctx.fill();

    // Purple accent bar
    const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
    accentGrad.addColorStop(0, "#7c3aed");
    accentGrad.addColorStop(1, "#06b6d4");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, W, 4);

    // Board (240x240 at left)
    const BOARD_X = 24, BOARD_Y = 40, BOARD_SIZE = 248;
    // Board border
    ctx.fillStyle = "#2a2040";
    ctx.roundRect(BOARD_X - 4, BOARD_Y - 4, BOARD_SIZE + 8, BOARD_SIZE + 8, 8);
    ctx.fill();
    renderFenToCanvas(ctx, fen, BOARD_X, BOARD_Y, BOARD_SIZE);

    // Right column
    const RX = BOARD_X + BOARD_SIZE + 28;
    const RW = W - RX - 20;

    // V-Max branding
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillStyle = "#7c3aed";
    ctx.textAlign = "left";
    ctx.fillText("⚡ V-MAX CHESS INSIGHTS", RX, 28);

    // Result badge
    const resultColor = result === "1-0" ? "#34d399" : result === "0-1" ? "#f87171" : "#a1a1aa";
    const resultText = result === "1-0" ? "Trắng thắng" : result === "0-1" ? "Đen thắng" : "Hòa";
    ctx.fillStyle = resultColor + "22";
    ctx.roundRect(RX, 38, RW, 28, 6);
    ctx.fill();
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillStyle = resultColor;
    ctx.textAlign = "center";
    ctx.fillText(resultText, RX + RW / 2, 57);

    // Player names
    ctx.textAlign = "left";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillStyle = "#e4e4e7";
    ctx.fillText("⬜ " + whitePlayer, RX, 90);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px Inter, sans-serif";
    if (accuracyWhite != null) ctx.fillText(`Độ chính xác: ${accuracyWhite}%   !! ${brilliantCountW}   ?? ${blunderCountW}`, RX, 107);

    ctx.fillStyle = "#e4e4e7";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("⬛ " + blackPlayer, RX, 130);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px Inter, sans-serif";
    if (accuracyBlack != null) ctx.fillText(`Độ chính xác: ${accuracyBlack}%   !! ${brilliantCountB}   ?? ${blunderCountB}`, RX, 147);

    // Divider
    ctx.strokeStyle = "#2a2040";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RX, 164);
    ctx.lineTo(RX + RW, 164);
    ctx.stroke();

    // Accuracy visual bars
    const drawAccBar = (label: string, pct: number | null | undefined, yy: number, color: string) => {
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#71717a";
      ctx.textAlign = "left";
      ctx.fillText(label, RX, yy + 11);
      const barX = RX + 52, barW = RW - 56;
      ctx.fillStyle = "#1e1b36";
      ctx.roundRect(barX, yy, barW, 12, 4);
      ctx.fill();
      if (pct) {
        const acGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        acGrad.addColorStop(0, color);
        acGrad.addColorStop(1, color + "99");
        ctx.fillStyle = acGrad;
        ctx.roundRect(barX, yy, Math.round((pct / 100) * barW), 12, 4);
        ctx.fill();
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.fillText(`${pct}%`, barX + barW - 3, yy + 10);
      }
    };
    drawAccBar("Trắng", accuracyWhite, 174, "#e4e4e7");
    drawAccBar("Đen  ", accuracyBlack, 194, "#7c3aed");

    // URL watermark
    ctx.font = "10px monospace";
    ctx.fillStyle = "#3f3560";
    ctx.textAlign = "left";
    if (gameHash) {
      ctx.fillText(`v-max.app/game/${gameHash.slice(0, 20)}...`, RX, H - 12);
    } else {
      ctx.fillText("v-max.app", RX, H - 12);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setGenerated(dataUrl);
  }, [fen, whitePlayer, blackPlayer, accuracyWhite, accuracyBlack, result, brilliantCountW, brilliantCountB, blunderCountW, blunderCountB, gameHash]);

  const handleOpen = () => {
    setIsOpen(true);
    setGenerated(null);
    setTimeout(generateImage, 50);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!generated) return;
    const a = document.createElement("a");
    a.href = generated;
    a.download = `vmax-chess-${gameHash?.slice(0, 8) ?? "game"}.png`;
    a.click();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        title="Tạo ảnh chia sẻ"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Chia sẻ</span>
      </button>

      {/* Hidden canvas used for rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
          <div
            className="relative rounded-2xl border border-border bg-zinc-900 p-5 shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-3 font-bold text-sm text-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Chia sẻ kết quả ván đấu
            </h3>

            {generated ? (
              <img src={generated} alt="Share card" className="w-full rounded-lg border border-border mb-3" />
            ) : (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border mb-3">
                Đang tạo ảnh...
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={!generated}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Tải ảnh (.png)
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Đã sao chép!" : "Sao chép Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
