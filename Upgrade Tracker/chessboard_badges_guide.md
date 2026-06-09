# 🏆 Hướng Dẫn Tích Hợp Huy Hiệu Đánh Giá Lên Bàn Cờ (Chessboard Move Badges Guide)

Tài liệu này đặc tả cách sửa đổi code để hiển thị các huy hiệu đánh giá nước đi (Brilliant, Best, Blunder...) trực tiếp ở góc trên bên phải của ô cờ đích (Destination Square) trên bàn cờ, kèm theo việc tô màu nền của ô cờ đó, khớp hoàn toàn với các hình ảnh mẫu bạn đã gửi.

---

## 📐 1. CƠ CHẾ HOẠT ĐỘNG (HOW IT WORKS)

Chessground (thư viện bàn cờ đang dùng) vẽ các ô cờ dưới dạng các thẻ HTML tùy chỉnh `<square>` nằm trong container `.cg-wrap`. Cấu trúc DOM của một ô cờ có quân cờ sẽ như sau:

```html
<square class="e4 last-move occupied">
  <piece class="white pawn"></piece>
  <!-- Chúng ta sẽ chèn huy hiệu tuyệt đối vào đây -->
  <div class="move-badge bg-emerald-600">★</div>
</square>
```

Vì các ô `<square>` được đặt thuộc tính CSS `position: absolute` bởi Chessground, chúng ta có thể:
1.  Dùng React `useEffect` tìm ô cờ đích của nước đi vừa thực hiện (ví dụ: ô `e4`).
2.  Xóa các huy hiệu cũ trên bàn cờ.
3.  Tạo một thẻ `div` mới làm huy hiệu với màu sắc và biểu tượng tương ứng với nhãn đánh giá (Best, Blunder, Theory...) rồi `appendChild` vào ô cờ đó.
4.  Thêm class CSS tùy chỉnh cho ô cờ đó để thay đổi màu sắc highlight của ô cờ (ví dụ: màu xanh cho Best, màu đỏ cho Blunder) thay vì màu vàng mặc định của Chessground.

---

## 🛠️ 2. CHI TIẾT CÁC THÀNH PHẦN CODE CẦN VIẾT

### 2.1. Định Nghĩa Cấu Hình Huy Hiệu (`ChessBoard.tsx`)
Chúng ta định nghĩa cấu trúc dữ liệu cho các nhãn nước đi bao gồm biểu tượng (SVG hoặc text) và các class CSS màu sắc:

```typescript
const BADGE_CONFIGS: Record<string, { symbol: string; bgClass: string; squareClass: string }> = {
  brilliant:  { symbol: "!!", bgClass: "bg-cyan-500 text-white",     squareClass: "highlight-brilliant" },
  great:      { symbol: "!",  bgClass: "bg-indigo-600 text-white",    squareClass: "highlight-great" },
  best:       { symbol: "★",  bgClass: "bg-emerald-600 text-white",   squareClass: "highlight-best" },
  excellent:  { symbol: "👍", bgClass: "bg-green-600 text-white",     squareClass: "highlight-excellent" },
  good:       { symbol: "✓",  bgClass: "bg-teal-600 text-white",      squareClass: "highlight-good" },
  okay:       { symbol: "✓",  bgClass: "bg-zinc-500 text-white",      squareClass: "highlight-okay" },
  inaccuracy: { symbol: "?!", bgClass: "bg-amber-500 text-white",     squareClass: "highlight-inaccuracy" },
  mistake:    { symbol: "?",  bgClass: "bg-orange-500 text-white",    squareClass: "highlight-mistake" },
  blunder:    { symbol: "??", bgClass: "bg-red-600 text-white",       squareClass: "highlight-blunder" },
  theory:     { symbol: "📖", bgClass: "bg-amber-800 text-white",     squareClass: "highlight-theory" },
};
```

---

### 2.2. Viết Logic DOM chèn Huy Hiệu (`ChessBoard.tsx`)
Chúng ta thêm một `useEffect` trong `src/shared/components/board/ChessBoard.tsx` để theo dõi nước đi hiện tại (`lastMove`) và nhãn nước đi hiện tại:

```tsx
// Nhận thêm prop `evalLabel` đại diện cho nhãn nước đi vừa đi (ví dụ: "best", "blunder"...)
interface ChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: [string, string];
  evalLabel?: string; // <-- Prop mới nhận nhãn đánh giá
  // ... các props khác
}

export function ChessBoard({
  fen,
  orientation = "white",
  lastMove,
  evalLabel,
  // ...
}: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Effect xử lý chèn huy hiệu và đổi màu ô cờ đích
  useEffect(() => {
    if (!containerRef.current || !lastMove) return;

    const boardEl = containerRef.current;
    
    // 1. Dọn dẹp: Xóa tất cả các huy hiệu cũ và class highlight cũ
    boardEl.querySelectorAll(".move-badge").forEach(el => el.remove());
    boardEl.querySelectorAll("square").forEach(sq => {
      sq.classList.remove(
        "highlight-brilliant", "highlight-great", "highlight-best", 
        "highlight-excellent", "highlight-good", "highlight-okay", 
        "highlight-inaccuracy", "highlight-mistake", "highlight-blunder", "highlight-theory"
      );
    });

    // 2. Tìm ô cờ đích (Ví dụ: nước e2-e4 -> ô đích là e4)
    const destSquareName = lastMove[1]; // "e4"
    const destSquareEl = boardEl.querySelector(`square.${destSquareName}`);

    if (destSquareEl && evalLabel && BADGE_CONFIGS[evalLabel]) {
      const config = BADGE_CONFIGS[evalLabel];

      // 3. Đổi màu nền highlight của ô cờ
      destSquareEl.classList.add(config.squareClass);

      // 4. Tạo phần tử Badge mới
      const badge = document.createElement("div");
      badge.className = `move-badge absolute top-1 right-1 flex h-[28%] w-[28%] items-center justify-center rounded-full text-[9px] font-extrabold shadow-md z-10 select-none animate-in scale-in duration-200 ${config.bgClass}`;
      badge.innerText = config.symbol;

      // 5. Chèn badge vào ô cờ
      destSquareEl.appendChild(badge);
    }
  }, [lastMove, evalLabel]);

  // ... render
}
```

---

### 2.3. Viết CSS Highlight Màu Nền Ô Cờ (`styles.css`)
Thêm các lớp phủ màu sắc (tint overlay) cho ô cờ tương ứng với màu nền trong ảnh mẫu của bạn:

```css
/* Trong file src/styles.css */

/* Định nghĩa màu highlight cho ô cờ đích */
square.highlight-brilliant {
  background-color: rgba(6, 182, 212, 0.4) !important; /* Xanh ngọc nhạt */
}
square.highlight-great {
  background-color: rgba(79, 70, 229, 0.4) !important; /* Xanh chàm nhạt */
}
square.highlight-best {
  background-color: rgba(16, 185, 129, 0.35) !important; /* Xanh lá cờ nhạt */
}
square.highlight-excellent {
  background-color: rgba(34, 197, 94, 0.3) !important; /* Xanh lá nhạt */
}
square.highlight-good {
  background-color: rgba(20, 184, 166, 0.3) !important; /* Xanh ngọc lam */
}
square.highlight-okay {
  background-color: rgba(113, 113, 122, 0.3) !important; /* Xám nhạt */
}
square.highlight-inaccuracy {
  background-color: rgba(245, 158, 11, 0.3) !important; /* Vàng nhạt */
}
square.highlight-mistake {
  background-color: rgba(249, 115, 22, 0.35) !important; /* Cam nhạt */
}
square.highlight-blunder {
  background-color: rgba(220, 38, 38, 0.4) !important; /* Đỏ nhạt */
}
square.highlight-theory {
  background-color: rgba(180, 83, 9, 0.3) !important; /* Nâu nhạt */
}

/* Định nghĩa kiểu dáng và kích thước cho huy hiệu move-badge */
.move-badge {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  pointer-events: none; /* Tránh cản trở việc click vào ô cờ */
}
```

---

## 💬 CÂU HỎI THẢO LUẬN (DISCUSS)

Bạn thấy giải pháp tích hợp trực tiếp qua React Effect này thế nào? 
1.  **Về mặt biểu tượng:** Bạn muốn sử dụng ký tự text đơn giản (`!!`, `!`, `★`, `📖`) hay muốn tôi sử dụng các SVG Icon sắc nét hơn cho các huy hiệu này?
2.  **Về cách thức áp dụng:** Tôi có nên tiến hành chỉnh sửa code trực tiếp vào dự án cho tính năng này và bảng thống kê Accuracies luôn không, hay bạn muốn tiếp tục thảo luận thêm?
