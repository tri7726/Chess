# 🛠️ Hướng Dẫn Nâng Cấp Code Giao Diện (UI/UX Code Upgrade Guide)

Tài liệu này phân tích chi tiết sự khác biệt giữa giao diện hiện tại của dự án và hình ảnh mẫu bạn cung cấp (bản thiết kế chuẩn Chess.com), đồng thời cung cấp hướng dẫn sửa code chi tiết cho các file tương ứng.

---

## 📋 1. DANH SÁCH FILE CẦN CẢI THIỆN
Để đạt được giao diện như hình ảnh mẫu, chúng ta cần cập nhật 3 file chính:
1.  `src/routes/game.$hash.tsx` — Chỉnh sửa layout tổng thể của Bàn cờ, bổ sung Banner tên kỳ thủ và chỉnh sửa cột xếp chồng.
2.  `src/features/analysis/components/StatsTable.tsx` — Viết lại hoàn toàn giao diện bảng thống kê: ô độ chính xác lớn ở trên đầu, cột tên kỳ thủ thay vì White/Black, và hệ thống huy hiệu hình tròn chuẩn Chess.com.
3.  `src/styles.css` — Định nghĩa lại kích thước, bóng đổ và căn chỉnh cho cột Eval Bar cùng các huy hiệu nước đi.

---

## 🛠️ 2. CHI TIẾT CÁC THAY ĐỔI TRONG CODE

### 2.1. Thêm Banner Tên Kỳ Thủ & Sắp Xếp Lại Bàn Cờ (`game.$hash.tsx`)
**Hiện tại:** Bàn cờ và Eval Bar được đặt trực tiếp trong flexbox mà không có thông tin kỳ thủ bao quanh, gây ra hiện tượng Eval Bar bị kéo dài quá chiều cao bàn cờ và hiển thị lệch.

**Định hướng sửa code:**
*   Đọc tên kỳ thủ từ `game.metadata.white` và `game.metadata.black`.
*   Đặt bàn cờ và Eval Bar vào trong một khối Container có giới hạn chiều cao chính xác.
*   Hiển thị Banner Đen ở phía trên bàn cờ, Banner Trắng ở phía dưới bàn cờ. Nếu lật bàn cờ (`orientation === "black"`), vị trí banner sẽ tự động đảo ngược.

**Mẫu code đề xuất cấu trúc layout mới:**
```tsx
// Trong file src/routes/game.$hash.tsx, phần render của bàn cờ:

const whitePlayer = game?.metadata.white ?? "White Player";
const blackPlayer = game?.metadata.black ?? "Black Player";

// Xác định xem ai ở trên, ai ở dưới dựa trên góc nhìn (orientation)
const topPlayerName = orientation === "white" ? blackPlayer : whitePlayer;
const bottomPlayerName = orientation === "white" ? whitePlayer : blackPlayer;

return (
  // ...
  <div className="flex flex-col gap-2">
    {/* Banner kỳ thủ phía trên */}
    <div className="flex items-center justify-between rounded-t bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-100 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-zinc-700 flex items-center justify-center text-xs">👤</div>
        <span>{topPlayerName}</span>
      </div>
      {/* Có thể thêm đồng hồ thời gian hoặc quốc kỳ tại đây */}
    </div>

    {/* Hàng chứa Eval Bar và Chess Board */}
    <div className="flex gap-3 items-stretch h-[500px] md:h-[600px] w-full">
      <EvalBar
        cp={currentEval?.evalAfter}
        mate={currentEval?.mate}
        turn={currentEval?.color}
        orientation={orientation}
        isAnalyzing={state.isAnalyzing}
      />
      <div className="flex-1 min-w-0">
        <ChessBoard
          fen={currentFen}
          lastMove={lastMove}
          heatmap={heatmap}
          shapes={boardShapes}
          orientation={orientation}
        />
      </div>
    </div>

    {/* Banner kỳ thủ phía dưới */}
    <div className="flex items-center justify-between rounded-b bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-100 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold text-primary">GM</div>
        <span>{bottomPlayerName}</span>
      </div>
    </div>
  </div>
  // ...
)
```

---

### 2.2. Viết Lại Bảng Thống Kê Chuẩn Chess.com (`StatsTable.tsx`)
**Hiện tại:** Bảng sử dụng emoji thô sơ, hiển thị dạng danh sách phẳng và nhãn "White/Black" cố định.

**Định hướng sửa code:**
*   Truyền tên kỳ thủ thực tế vào StatsTable (`whitePlayerName` và `blackPlayerName`).
*   Vẽ 2 hộp Accuracy lớn ở trên cùng: Nền trắng chữ đen cho Trắng, Nền đen chữ trắng cho Đen.
*   Thay thế các emoji thô bằng các Badge hình tròn đặc trưng của Chess.com (chứa các ký tự `!!`, `!`, `★`, `👍`, `✓`, `?!`, `?`, `??`, `📖`).

**Mẫu code đề xuất cho `StatsTable.tsx` mới:**
```tsx
import type { LabelCounts } from "@/features/analysis/lib/move-labels";
import { Star, ThumbsUp, Check, BookOpen } from "lucide-react";

interface StatsTableProps {
  white?: LabelCounts;
  black?: LabelCounts;
  accuracyWhite?: number;
  accuracyBlack?: number;
  whitePlayerName?: string;
  blackPlayerName?: string;
}

// Cấu trúc nhãn chuẩn Chess.com với màu sắc tương ứng
const LABELS_CONFIG = [
  { key: "brilliant",  name: "Brilliant",  symbol: "!!", colorClass: "bg-cyan-500 text-white" },
  { key: "great",      name: "Great",      symbol: "!",  colorClass: "bg-indigo-600 text-white" },
  { key: "best",       name: "Best",       symbol: "★",  colorClass: "bg-emerald-600 text-white" },
  { key: "excellent",  name: "Excellent",  symbol: "👍", colorClass: "bg-green-600 text-white" },
  { key: "okay",       name: "Okay",       symbol: "✓",  colorClass: "bg-zinc-500 text-white" },
  { key: "inaccuracy", name: "Inaccuracy", symbol: "?!", colorClass: "bg-amber-500 text-white" },
  { key: "mistake",    name: "Mistake",    symbol: "?",  colorClass: "bg-orange-500 text-white" },
  { key: "blunder",    name: "Blunder",    symbol: "??", colorClass: "bg-red-600 text-white" },
  { key: "theory",     name: "Theory",     symbol: "📖", colorClass: "bg-amber-800 text-white" },
] as const;

export function StatsTable({
  white = {} as any,
  black = {} as any,
  accuracyWhite,
  accuracyBlack,
  whitePlayerName = "White",
  blackPlayerName = "Black",
}: StatsTableProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
      
      {/* 1. Phần Tiêu Đề Lớn: Accuracies */}
      <div className="text-center font-semibold text-lg text-zinc-100">Accuracies</div>

      {/* 2. Ô Độ Chính Xác Lớn Song Song */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-100 py-3 text-zinc-900 shadow-md">
          <span className="text-2xl font-extrabold font-mono leading-none">
            {accuracyWhite !== undefined ? `${accuracyWhite}%` : "N/A"}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 py-3 text-zinc-100 shadow-md">
          <span className="text-2xl font-extrabold font-mono leading-none">
            {accuracyBlack !== undefined ? `${accuracyBlack}%` : "N/A"}
          </span>
        </div>
      </div>

      {/* 3. Tên Kỳ Thủ ở Tiêu Đề Cột */}
      <div className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-x-2 px-1 text-xs font-semibold text-zinc-400 border-b border-zinc-800 pb-2">
        <span className="text-left truncate max-w-[120px]">{whitePlayerName}</span>
        <span className="text-center">VS</span>
        <span className="text-right truncate max-w-[120px]">{blackPlayerName}</span>
      </div>

      {/* 4. Danh Sách Chỉ Số Xếp Chồng Có Huy Hiệu Tròn Ở Giữa */}
      <div className="space-y-2.5">
        {LABELS_CONFIG.map((l) => {
          const wCount = white[l.key] ?? 0;
          const bCount = black[l.key] ?? 0;

          return (
            <div
              key={l.key}
              className="grid grid-cols-[1fr_2rem_1fr] items-center gap-x-2 px-1 text-sm text-zinc-300"
            >
              {/* Cột số liệu Trắng (bên trái) */}
              <div className="flex items-center gap-2 text-left">
                <span className="text-xs text-zinc-500 font-semibold">{l.name}</span>
                <span className={`font-mono font-bold ${wCount > 0 ? 'text-zinc-100' : 'text-zinc-600'}`}>
                  {wCount}
                </span>
              </div>

              {/* Huy hiệu tròn ở giữa */}
              <div className="flex justify-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold shadow-inner ${l.colorClass}`}>
                  {l.symbol}
                </div>
              </div>

              {/* Cột số liệu Đen (bên phải) */}
              <div className="flex items-center gap-2 justify-end text-right">
                <span className={`font-mono font-bold ${bCount > 0 ? 'text-zinc-100' : 'text-zinc-600'}`}>
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
```

---

### 2.3. Tối Ưu Hóa CSS Cho Đồ Thị & Bảng (`styles.css`)
**Hiện tại:** Eval Bar có chiều rộng tĩnh và các ô chứa huy hiệu chưa có cấu trúc chuyển tiếp (transition).

**Định hướng sửa CSS:**
*   Đảm bảo `.eval-bar-vertical` hoạt động chính xác khi co giãn chiều cao và có viền bo mượt mà.
*   Thêm các hiệu ứng chuyển đổi mượt mà khi hover vào các dòng thống kê để tăng tính chuyên nghiệp.

```css
/* Trong file src/styles.css */

/* Tối ưu hóa Eval Bar */
.eval-bar-vertical {
  width: 28px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-muted);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.2);
  border: 1.5px solid var(--color-border);
  transition: all 0.3s ease;
}

/* Hiệu ứng di chuột vào dòng thống kê */
.stats-row-hover {
  transition: background-color 0.2s ease;
}
.stats-row-hover:hover {
  background-color: rgba(255, 255, 255, 0.03);
}
```

---

## 💬 BƯỚC TIẾP THEO
Bạn muốn tôi bắt đầu thực hiện cập nhật code cho **file nào trước** trong số 3 file này để khớp chính xác với hình ảnh thiết kế? Hãy cho tôi biết ý kiến của bạn!
