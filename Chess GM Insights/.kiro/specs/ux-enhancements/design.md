# Thiết Kế Kỹ Thuật: Nâng Cấp Trải Nghiệm Người Dùng (UX Enhancements)

## Tổng Quan

Tài liệu này mô tả thiết kế kỹ thuật đầy đủ cho việc nâng cấp UX của ứng dụng Chess GM Insights (V-Max). Dựa trên phân tích code hiện tại, có 6 nhóm cải tiến chính được xác định.

---

## 1. Thiết Kế Cấp Cao (High-Level Design)

### 1.1 Sơ Đồ Kiến Trúc Hiện Tại

```
┌─────────────────────────────────────────────────────┐
│                    GamePage                         │
│  ┌──────────────────┐  ┌───────────────────────┐   │
│  │   Left Column    │  │    Right Column        │   │
│  │  ┌────────────┐  │  │  ┌─────────────────┐  │   │
│  │  │ ChessBoard │  │  │  │  AnalysisPanel  │  │   │
│  │  └────────────┘  │  │  │  ┌───────────┐  │  │   │
│  │  ┌────────────┐  │  │  │  │  Tabs:    │  │  │   │
│  │  │BoardCtrl   │  │  │  │  │ Overview  │  │  │   │
│  │  └────────────┘  │  │  │  │ Moves     │  │  │   │
│  └──────────────────┘  │  │  │ Training  │  │  │   │
│                        │  │  └───────────┘  │  │   │
│                        │  └─────────────────┘  │   │
└─────────────────────────────────────────────────────┘
```

### 1.2 Kiến Trúc Sau Nâng Cấp

```
┌────────────────────────────────────────────────────────────┐
│                       GamePage                             │
│                                                            │
│  Keyboard Navigation Provider (useKeyboardNav hook)        │
│  ┌─────────────────────┐  ┌────────────────────────────┐  │
│  │    Left Column      │  │      Right Column          │  │
│  │  ┌───────────────┐  │  │  ┌──────────────────────┐  │  │
│  │  │  PlayerInfo   │  │  │  │    AnalysisPanel      │  │  │
│  │  │  (new)        │  │  │  │  ┌────────────────┐  │  │  │
│  │  └───────────────┘  │  │  │  │ Tabs (4 tabs): │  │  │  │
│  │  ┌───────────────┐  │  │  │  │ Overview       │  │  │  │
│  │  │  ChessBoard   │  │  │  │  │ Moves          │  │  │  │
│  │  │ + Move        │  │  │  │  │ Training       │  │  │  │
│  │  │   Annotation  │  │  │  │  │ Opening (new)  │  │  │  │
│  │  │   overlay     │  │  │  │  └────────────────┘  │  │  │
│  │  └───────────────┘  │  │  └──────────────────────┘  │  │
│  │  ┌───────────────┐  │  └────────────────────────────┘  │
│  │  │ BoardControls │  │                                   │
│  │  │ + Speed btn   │  │                                   │
│  │  │ + Flip board  │  │                                   │
│  │  └───────────────┘  │                                   │
│  └─────────────────────┘                                   │
│                                                            │
│  ToastProvider (sonner) — trạng thái feedback              │
└────────────────────────────────────────────────────────────┘
```

### 1.3 Các Components Cần Thêm / Sửa

| Component | Loại | Mô tả |
|---|---|---|
| `PlayerInfo` | Mới | Hiển thị tên người chơi, Elo, kết quả từ PGN headers |
| `OpeningTab` | Mới | Tab phân tích khai cuộc (ECO code, tên khai cuộc) |
| `MoveAnnotation` | Mới | Overlay nước đi tốt nhất của engine lên bàn cờ |
| `useKeyboardNav` | Hook mới | Điều hướng nước đi bằng phím ← → Home End |
| `useAutoPlay` | Hook mới | Tự động phát lại ván cờ với tốc độ tuỳ chỉnh |
| `BoardControls` | Sửa | Thêm nút flip board + nút autoplay + tốc độ |
| `EvalChart` | Sửa | Click vào điểm trên chart → nhảy đến ply đó |
| `MovesList` | Sửa | Auto-scroll đến nước hiện tại, thêm tooltip |
| `TrainingTab` | Sửa | Hiện board preview thật trong puzzle cards |
| `UploadModal` | Sửa | Validate PGN ngay khi paste, hiện lỗi rõ ràng |

### 1.4 Data Flow

```
PGN text
   │
   ▼
parsePgn() ──► ParsedGame { headers, moves[], initialFen }
                                │
                    ┌───────────┴───────────┐
                    │                       │
              useAnalyzer()           PlayerInfo
              (engine loop)           (từ headers)
                    │
              AnalysisState
              { evals[], evalPoints[], counts, accuracy }
                    │
        ┌───────────┼───────────────┐
        │           │               │
   EvalChart    StatsTable      MovesList
   (clickable)  (accuracy bar)  (auto-scroll)
```

---

## 2. Thiết Kế Cấp Thấp (Low-Level Design)

### 2.1 Hook: `useKeyboardNav`

**File:** `src/hooks/use-keyboard-nav.ts`

```typescript
interface UseKeyboardNavOptions {
  currentPly: number;
  totalPlies: number;
  onPlyChange: (ply: number) => void;
  enabled?: boolean;
}

function useKeyboardNav(options: UseKeyboardNavOptions): void

// Bindings:
// ArrowLeft  → onPlyChange(currentPly - 1)
// ArrowRight → onPlyChange(currentPly + 1)
// Home       → onPlyChange(0)
// End        → onPlyChange(totalPlies)
// Ngăn scroll khi focus vào bàn cờ
```

**Logic:**
```typescript
useEffect(() => {
  if (!enabled) return;
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return; // không override input
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); onPlyChange(Math.max(0, currentPly - 1)); break;
      case "ArrowRight": e.preventDefault(); onPlyChange(Math.min(totalPlies, currentPly + 1)); break;
      case "Home":       e.preventDefault(); onPlyChange(0); break;
      case "End":        e.preventDefault(); onPlyChange(totalPlies); break;
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [currentPly, totalPlies, onPlyChange, enabled]);
```

---

### 2.2 Hook: `useAutoPlay`

**File:** `src/hooks/use-auto-play.ts`

```typescript
interface UseAutoPlayOptions {
  currentPly: number;
  totalPlies: number;
  onPlyChange: (ply: number) => void;
  speedMs?: number; // default 600ms
}

interface UseAutoPlayReturn {
  isPlaying: boolean;
  toggle: () => void;
  stop: () => void;
  setSpeed: (ms: number) => void;
}

function useAutoPlay(options: UseAutoPlayOptions): UseAutoPlayReturn
```

**Logic:**
```typescript
// Dùng useRef cho interval, tự dừng khi đến cuối
// Tốc độ tuỳ chỉnh: 300ms (nhanh) | 600ms (bình thường) | 1200ms (chậm)
const SPEEDS = { fast: 300, normal: 600, slow: 1200 };
```

---

### 2.3 Component: `PlayerInfo`

**File:** `src/components/game/PlayerInfo.tsx`

**Props:**
```typescript
interface PlayerInfoProps {
  headers: Record<string, string>; // từ ParsedGame.headers
  result?: string;                 // "1-0" | "0-1" | "1/2-1/2"
}
```

**Layout:**
```
┌────────────────────────────────────┐
│ [♙ White name]    Elo  [♟ Black name]  Elo │
│ [Date] [Event]                     │
│ Result: [1-0 | 0-1 | ½-½]         │
└────────────────────────────────────┘
```

**Data mapping:**
```typescript
const white = headers["White"] ?? "White";
const black = headers["Black"] ?? "Black";
const whiteElo = headers["WhiteElo"];
const blackElo = headers["BlackElo"];
const event = headers["Event"];
const date = headers["Date"];
const result = headers["Result"];
```

---

### 2.4 Sửa `BoardControls` — Thêm Flip Board + AutoPlay

**Props bổ sung:**
```typescript
interface BoardControlsProps {
  // ... props hiện tại ...
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  onFlip?: () => void;
  playSpeed?: "slow" | "normal" | "fast";
  onSpeedChange?: (speed: "slow" | "normal" | "fast") => void;
}
```

**UI thêm vào:**
```tsx
// Nút Flip (FlipHorizontal2 icon từ lucide)
<Button size="icon" variant="ghost" onClick={onFlip} title="Flip board (F)">
  <FlipHorizontal2 className="h-4 w-4" />
</Button>

// Nút Play/Pause
<Button size="icon" variant="ghost" onClick={onPlayToggle}>
  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
</Button>

// Speed selector (DropdownMenu)
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="icon" variant="ghost"><Gauge className="h-4 w-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => onSpeedChange?.("slow")}>Chậm</DropdownMenuItem>
    <DropdownMenuItem onClick={() => onSpeedChange?.("normal")}>Bình thường</DropdownMenuItem>
    <DropdownMenuItem onClick={() => onSpeedChange?.("fast")}>Nhanh</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 2.5 Sửa `EvalChart` — Click để nhảy đến ply

**Props bổ sung:**
```typescript
interface EvalChartProps {
  data?: { move: number; eval: number }[];
  currentPly?: number;   // highlight điểm hiện tại
  onPlyClick?: (ply: number) => void;  // MỚI
}
```

**Recharts implementation:**
```tsx
// Dùng onClick trên AreaChart
<AreaChart
  data={data}
  onClick={(chartData) => {
    if (chartData?.activePayload?.[0]) {
      const ply = chartData.activePayload[0].payload.move;
      onPlyClick?.(ply);
    }
  }}
>
  {/* ReferenceLine dọc tại currentPly */}
  <ReferenceLine
    x={currentPly}
    stroke="oklch(0.7 0.15 297)"
    strokeDasharray="3 3"
  />
  {/* ... */}
</AreaChart>
```

---

### 2.6 Sửa `MovesList` — Auto-scroll và Tooltip

**Auto-scroll logic:**
```typescript
// Ref map cho mỗi ply
const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

useEffect(() => {
  const el = rowRefs.current.get(currentPly);
  if (el) {
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}, [currentPly]);
```

**Tooltip trên badge:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const LABEL_DESCRIPTION: Record<string, string> = {
  brilliant: "Nước đi xuất sắc, thường là hi sinh độc đáo",
  blunder:   "Sai lầm nghiêm trọng, mất lợi thế lớn",
  // ...
};

// Wrap Badge trong Tooltip
<Tooltip>
  <TooltipTrigger asChild>
    <Badge ...>{LABEL_ICON[label]}</Badge>
  </TooltipTrigger>
  <TooltipContent>{LABEL_DESCRIPTION[label]}</TooltipContent>
</Tooltip>
```

---

### 2.7 Sửa `TrainingTab` — Board Preview Thật

Thay thế placeholder text bằng `ChessBoard` mini:

```tsx
// Trong puzzle card, thay:
// <div className="...">Board Preview</div>
// Bằng:
<div className="mb-2 aspect-square w-full rounded-md overflow-hidden pointer-events-none">
  <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
    <ChessBoard
      fen={p.fen}
      orientation={p.fen.split(" ")[1] === "w" ? "white" : "black"}
      interactive={false}
    />
  </Suspense>
</div>
```

---

### 2.8 Sửa `UploadModal` — Validation PGN Real-time

```typescript
// Validate khi paste
function validatePgn(text: string): { valid: boolean; error?: string } {
  if (!text.trim()) return { valid: false, error: "PGN trống" };
  // Kiểm tra có ít nhất 1 nước đi
  if (!/\d+\.\s*\S+/.test(text)) {
    return { valid: false, error: "Không tìm thấy nước đi trong PGN" };
  }
  // Thử parse
  try {
    const game = parsePgn(text);
    if (game.moves.length === 0) return { valid: false, error: "Ván cờ không có nước đi" };
    return { valid: true };
  } catch (e) {
    return { valid: false, error: "PGN không hợp lệ: " + String(e) };
  }
}
```

**State bổ sung:**
```typescript
const [pgnError, setPgnError] = useState<string | null>(null);

// Trong onChange của Textarea:
onChange={(e) => {
  setPgn(e.target.value);
  if (e.target.value.length > 10) {
    const result = validatePgn(e.target.value);
    setPgnError(result.valid ? null : result.error ?? null);
  } else {
    setPgnError(null);
  }
}}
```

---

### 2.9 Tab Khai Cuộc Mới: `OpeningTab`

**File:** `src/components/game/OpeningTab.tsx`

**Props:**
```typescript
interface OpeningTabProps {
  moves: ParsedMove[];
  headers: Record<string, string>;
  onPlyClick: (ply: number) => void;
}
```

**Logic:**
```typescript
// Lấy tên khai cuộc từ headers PGN nếu có
const openingName = headers["Opening"] ?? headers["ECO"] ?? null;

// Phát hiện theory moves (label === "theory")
const theoryMoves = evals.filter(e => e.label === "theory");
const exitTheoryPly = theoryMoves.length > 0
  ? Math.max(...theoryMoves.map(e => e.ply)) + 1
  : 0;
```

**UI:**
```
┌─────────────────────────────────────┐
│ Khai cuộc: Sicilian Defense (B20)   │
│                                     │
│ Lý thuyết kết thúc tại nước: 12     │
│                                     │
│ Các nước lý thuyết:                 │
│  1. e4  [📖]  1... c5  [📖]         │
│  2. Nf3 [📖]  2... Nc6 [📖]         │
│  ...                                │
└─────────────────────────────────────┘
```

---

## 3. Keyboard Shortcut Map

| Phím | Chức năng |
|---|---|
| `←` | Nước trước |
| `→` | Nước tiếp theo |
| `Home` | Về đầu ván |
| `End` | Đến cuối ván |
| `Space` | Play/Pause autoplay |
| `F` | Lật bàn cờ |

---

## 4. Danh Sách File Cần Thay Đổi

```
src/
├── hooks/
│   ├── use-keyboard-nav.ts          [MỚI]
│   └── use-auto-play.ts             [MỚI]
├── components/
│   └── game/
│       ├── PlayerInfo.tsx           [MỚI]
│       ├── OpeningTab.tsx           [MỚI]
│       ├── BoardControls.tsx        [SỬA] thêm flip, play, speed
│       ├── EvalChart.tsx            [SỬA] thêm onClick + currentPly marker
│       ├── MovesList.tsx            [SỬA] auto-scroll + tooltip
│       └── TrainingTab.tsx          [SỬA] board preview thật
├── components/pgn/
│   └── UploadModal.tsx              [SỬA] validation real-time
└── routes/
    └── game.$hash.tsx               [SỬA] wire hooks + PlayerInfo + OpeningTab
```

---

## 5. Ưu Tiên Triển Khai

| Độ ưu tiên | Tính năng | Tác động UX | Độ phức tạp |
|---|---|---|---|
| 🔴 Cao | Keyboard navigation | Rất cao | Thấp |
| 🔴 Cao | Auto-scroll MovesList | Cao | Thấp |
| 🟡 Trung | PlayerInfo từ PGN headers | Trung | Thấp |
| 🟡 Trung | EvalChart clickable | Cao | Trung |
| 🟡 Trung | Flip board | Trung | Thấp |
| 🟢 Thấp | AutoPlay | Trung | Trung |
| 🟢 Thấp | Board preview trong Training | Trung | Thấp |
| 🟢 Thấp | PGN validation real-time | Trung | Thấp |
| 🟢 Thấp | Tab Khai cuộc | Trung | Cao |
