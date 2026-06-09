import { useEffect, useState } from "react";
import { Loader2, BookOpen } from "lucide-react";

interface OpeningExplorerProps {
  fen: string;
}

interface LichessMove {
  san: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
}

interface ExplorerData {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  opening?: {
    eco: string;
    name: string;
  };
}

const OPENING_DESCRIPTIONS: Record<string, string> = {
  "Sicilian Defense": "Phòng thủ phản công cực kỳ sắc bén của Đen chống lại 1.e4, tạo thế trận không đối xứng đẫm máu ngay từ đầu.",
  "Ruy Lopez": "Khai cuộc kinh điển nhắm vào Mã c6 bảo vệ trung tâm của Đen. Đòi hỏi sự kiên nhẫn và hiểu biết sâu sắc về cấu trúc Tốt.",
  "Italian Game": "Nhắm thẳng vào yếu điểm f7 của Đen, khai cuộc mở mang tính tấn công trực diện và nhanh chóng.",
  "French Defense": "Đen nhường một phần trung tâm để thiết lập cấu trúc Tốt đóng vững chắc, tìm cơ hội phản công mạnh mẽ vào cánh Hậu.",
  "Caro-Kann Defense": "Phòng thủ cực kỳ vững chãi, cấu trúc Tốt an toàn hơn French Defense, hướng tới tàn cuộc có lợi.",
  "Queen's Gambit": "Trắng tạm thời hy sinh Tốt biên c4 để giành hoàn toàn quyền kiểm soát trung tâm và phát triển quân nhanh chóng.",
  "King's Indian Defense": "Đen cho phép Trắng chiếm trung tâm để sau đó phá vỡ nó bằng các đòn đánh hông mạnh mẽ và bất ngờ.",
  "Nimzo-Indian Defense": "Ghim Mã c3 của Trắng bằng Tượng, ngăn chặn việc hình thành trung tâm Tốt hoàn hảo và gây khó dễ lâu dài.",
  "English Opening": "Khai cuộc đánh hông linh hoạt, thường chuyển đổi sang cấu trúc d4 hoặc d3 với ưu thế vị trí bền vững.",
  "Alekhine's Defense": "Dụ dỗ Tốt Trắng dâng cao sớm để sau đó tấn công tiêu diệt chính các Tốt trung tâm đã tiến quá xa đó.",
  "Pirc Defense": "Đen phòng thủ linh hoạt, cho phép Trắng lập trung tâm rộng rồi tìm cách đập tan nó từ xa.",
  "Slav Defense": "Bảo vệ Tốt d5 vững chãi mà không khóa Tượng c8, một lối chơi vô cùng chắc chắn trước Queen's Gambit.",
  "Scandinavian Defense": "Đen lập tức thách thức trung tâm bằng cách đưa Hậu ra sớm, mở toang thế trận thành những đòn đánh chiến thuật nhanh.",
  "Vienna Game": "Trắng phát triển Mã c3 để bảo vệ e4, chuẩn bị cho những đòn tấn công nguy hiểm bên cánh Vua nếu Đen sơ hở.",
  "King's Gambit": "Khai cuộc lãng mạn và vô cùng mạo hiểm: Trắng thí Tốt f4 ngay nước thứ 2 để mở cột f và chiếm trung tâm.",
  "Scotch Game": "Trắng dâng Tốt d4 ngay lập tức để phá vỡ cấu trúc đối xứng e5 của Đen, tạo thế trận mở và chiến thuật phức tạp."
};

function getOpeningDescription(name: string): string | null {
  for (const [key, desc] of Object.entries(OPENING_DESCRIPTIONS)) {
    if (name.includes(key)) return desc;
  }
  return null;
}

// LRU cache (max 200 entries) — prevents unbounded memory growth during long sessions
const MAX_CACHE = 200;
const cache = new Map<string, ExplorerData>();

function cacheSet(key: string, value: ExplorerData) {
  if (cache.size >= MAX_CACHE) {
    // Evict the oldest entry (first inserted key in Map iteration order)
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
}


export function OpeningExplorer({ fen }: OpeningExplorerProps) {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Standardize FEN to ignore move counts (keeps cache hit rate high)
    const parts = fen.split(" ");
    const simplifiedFen = parts.slice(0, 4).join(" "); // FEN position, active color, castling, en passant

    if (cache.has(simplifiedFen)) {
      setData(cache.get(simplifiedFen)!);
      setError(false);
      return;
    }

    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(simplifiedFen)}`
        );
        if (!res.ok) throw new Error("Failed to fetch Lichess Explorer data");
        const json = await res.json();

        if (active) {
          const fetchedData: ExplorerData = {
            white: json.white ?? 0,
            draws: json.draws ?? 0,
            black: json.black ?? 0,
            moves: (json.moves ?? []).slice(0, 4).map((m: any) => ({
              san: m.san,
              uci: m.uci,
              white: m.white ?? 0,
              draws: m.draws ?? 0,
              black: m.black ?? 0,
            })),
            opening: json.opening,
          };
          cacheSet(simplifiedFen, fetchedData);
          setData(fetchedData);
        }
      } catch (err) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [fen]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-card">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data || data.moves.length === 0) {
    return null; // Gracefully hide if error or no master games found
  }

  const totalGames = data.white + data.draws + data.black;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span>Lichess Master Opening Explorer</span>
      </div>

      {data.opening && (
        <div className="mb-2 rounded-md bg-muted/40 p-2.5 border border-border/50">
          <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px]">{data.opening.eco}</span>
            {data.opening.name}
          </p>
          {getOpeningDescription(data.opening.name) && (
            <p className="mt-1.5 text-[11px] text-muted-foreground italic leading-relaxed">
              "{getOpeningDescription(data.opening.name)}"
            </p>
          )}
        </div>
      )}

      {/* Win rate visual bar */}
      {totalGames > 0 && (
        <div className="space-y-1">
          <div className="flex h-3.5 w-full overflow-hidden rounded bg-muted text-[9px] font-bold text-center text-white">
            <div
              style={{ width: `${(data.white / totalGames) * 100}%` }}
              className="bg-zinc-100 text-zinc-950 flex items-center justify-center"
              title={`White win: ${Math.round((data.white / totalGames) * 100)}%`}
            >
              {Math.round((data.white / totalGames) * 100) > 15 && "W"}
            </div>
            <div
              style={{ width: `${(data.draws / totalGames) * 100}%` }}
              className="bg-zinc-500 text-zinc-100 flex items-center justify-center"
              title={`Draw: ${Math.round((data.draws / totalGames) * 100)}%`}
            >
              {Math.round((data.draws / totalGames) * 100) > 15 && "D"}
            </div>
            <div
              style={{ width: `${(data.black / totalGames) * 100}%` }}
              className="bg-zinc-850 text-zinc-200 flex items-center justify-center border-l border-zinc-700"
              title={`Black win: ${Math.round((data.black / totalGames) * 100)}%`}
            >
              {Math.round((data.black / totalGames) * 100) > 15 && "B"}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>White Win: {Math.round((data.white / totalGames) * 100)}%</span>
            <span>Draw: {Math.round((data.draws / totalGames) * 100)}%</span>
            <span>Black Win: {Math.round((data.black / totalGames) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Top moves suggestions */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Top Continuing Moves
        </p>
        <div className="grid grid-cols-1 gap-1">
          {data.moves.map((m, idx) => {
            const mTotal = m.white + m.draws + m.black;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-1 px-1.5 rounded hover:bg-muted border border-transparent hover:border-border transition-all"
              >
                <span className="font-bold text-primary">{m.san}</span>
                <span className="text-[10px] text-muted-foreground">
                  W:{Math.round((m.white / mTotal) * 100)}% | D:{Math.round((m.draws / mTotal) * 100)}% | B:{Math.round((m.black / mTotal) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
