# 🏗️ Chess Ultimate V-Max v3.0 — Kế Hoạch Triển Khai

> **Phiên bản tinh gọn** — Next.js + Vercel + Stockfish WASM + optional Supabase  
> **Mục tiêu:** Demo miễn phí, gắn link portfolio, impress người xem  
> **Thời gian:** 4 tuần  
> **Chi phí:** $0

---

## 📋 Mục Lục

1. [Tóm Tắt Thay Đổi](#1-tóm-tắt-thay-đổi)
2. [Kiến Trúc Tổng Thể](#2-kiến-trúc-tổng-thể)
3. [Tech Stack](#3-tech-stack)
4. [Module Giữ Lại (15)](#4-module-giữ-lại-15-module)
5. [Module Bỏ (8)](#5-module-bỏ-8-module)
6. [Database Schema](#6-database-schema)
7. [API Routes](#7-api-routes)
8. [Frontend Pages](#8-frontend-pages)
9. [UX Update (8 Cải Thiện)](#9-ux-update-8-cải-thiện)
10. [UI Layout](#10-ui-layout)
11. [Roadmap 4 Tuần](#11-roadmap-4-tuần)
12. [Chi Phí](#12-chi-phí)
13. [So Sánh WintrChess](#13-so-sánh-với-wintrchess)
14. [Tóm Tắt](#14-tóm-tắt)

---

## 1. Tóm Tắt Thay Đổi

| Feature | Trước | Sau | Lý do bỏ |
|---------|-------|-----|----------|
| Player Persona / "Nhân chơi" | Có 3 loại (phong cách, GM match-up, personality label) | ❌ **Bỏ** | Cần 5+ ván mới ổn định, 1 ván demo = sai |
| GM Match-up | Cosine similarity 50-500 GM | ❌ **Bỏ** | Phụ thuộc persona, không standalone |
| Cross-game pattern | SQL aggregate | ❌ **Bỏ** | Cần lưu nhiều ván, demo không có |
| Maia Chess | Lc0 engine + Maia weights | ❌ **Bỏ** | Cần GPU, không chạy WASM |
| Lc0 | MCTS, WDL % | ❌ **Bỏ** | Cần GPU, không chạy WASM |
| Real-time WebSocket | Live eval bar | ❌ **Bỏ** | Quá phức tạp cho demo |
| Hidden Threat Scanner | Null-move analysis | ❌ **Bỏ** | Ít giá trị demo |
| Resilience Score | Phòng thủ khi bị áp đảo | ❌ **Bỏ** | Cần nhiều ván bị áp đảo |
| Multi-line Depth | 3 nhánh tính cách | ❌ **Bỏ** | MultiPV=3 đủ, không cần nhãn tính cách |

**Giữ lại:** Phân tích per-ván (eval, 9-label, puzzle, SM-2 cơ bản, narrative template).

---

## 2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────┐
│         FRONTEND LAYER                  │
│  Next.js 14 (App Router)                │
│  ├── React Server Components            │
│  ├── Client Components (Board, Chart)   │
│  └── Tailwind CSS + shadcn/ui           │
│                                         │
│  [Deploy: Vercel Hobby — $0]            │
│  [Timeout: 10s serverless / ∞ static]   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         BACKEND LAYER                   │
│  Next.js API Routes (ít)                │
│  ├── /api/syzygy — Lichess proxy        │
│  ├── /api/games — CRUD (khi lưu)        │
│  └── /api/puzzles — SM-2 operations     │
│                                         │
│  [Stockfish 16.1 WASM — browser]        │
│  [Web Worker — không block UI]          │
│  [No GPU, no Lc0, no Maia]              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         DATA LAYER (OPTIONAL)           │
│  Supabase (Free Tier) — CHỈ KHI USER    │
│  CHỌN "LƯU"                             │
│  ├── PostgreSQL 500MB                   │
│  ├── Auth (Google, GitHub, Email)       │
│  ├── Storage 1GB (PGN files)            │
│  └── Realtime (200 concurrent)          │
│                                         │
│  [Không bắt buộc đăng nhập]             │
│  [Không bắt buộc lưu]                   │
└─────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Công nghệ | Lý do chọn |
|-------|-----------|------------|
| **Framework** | Next.js 14 App Router | Fullstack, Vercel native, React |
| **Language** | TypeScript | Type safety, maintainable |
| **Styling** | Tailwind CSS + shadcn/ui | Nhanh, đẹp, dark mode dễ |
| **Chess Board** | chessground (Lichess) | Open source, đẹp, đã test kỹ |
| **Chess Logic** | chess.js | Parse PGN, FEN, legal moves |
| **Engine** | stockfish.js (WASM) | Chạy browser, không cần server |
| **Charts** | Recharts | SVG interactive, nhẹ |
| **Database** | Supabase PostgreSQL | Free, Auth built-in, Realtime |
| **ORM/Client** | @supabase/supabase-js | Tích hợp sẵn, dễ dùng |
| **Icons** | Lucide React | Đẹp, consistent |
| **Deploy** | Vercel Hobby | Free, 1 click, global CDN |

---

## 4. Module Giữ Lại (15 Module)

### Phase 1: Khai Cuộc

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 18 | Lichess Opening Explorer | Client API call | Cache 30 ngày localStorage |
| 19 | Opening Blindspot Warning | Client-side | Ngưỡng 2%, ECO check |

### Phase 2: Trực Quan Hóa

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 5 | Eval Chart SVG | Recharts | Interactive, hover detail, **progressive vẽ** |
| 6 | Board Heatmap | chessground overlay | Đỏ/xanh/vàng, opacity 0.3 |
| 8 | Time Management | Custom SVG timeline | Dưới eval chart |

### Phase 3: Engine Analysis

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 1 | Stockfish 16.1 | stockfish.js WASM + **Web Worker** | Depth 18-20, ~3-5s/ván, **không block UI** |
| 4 | Template Narrative | Hardcoded 100 template/label | $0, không LLM |

### Phase 4: Chiến Thuật

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 7 | Pawn Structure | chess.js + custom logic | Doubled, Isolated, Passed |
| 17 | Tactics Tracker | Pattern recognition | Fork, Pin, Skewer, Discovery |

### Phase 5: Tâm Lý

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 10 | Tilt Detector | Client-side | Chuỗi 3 nước xấu + time < 3s |

### Phase 6: Thao Trường

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 13 | Puzzle Generator | Client-side | Trích blunder FEN + solution |
| 14 | Guess the Move | Interactive component | Pause board, user input |
| 15 | Syzygy | Client API hoặc Supabase Edge | Lichess tablebase |
| 21 | SM-2 Basic | localStorage (mặc định), Supabase (nếu lưu) | Đơn giản, sync khi đăng nhập |

### Phase 7: Share

| # | Module | Triển khai | Ghi chú |
|---|--------|------------|---------|
| 26 | Share Link | **Short hash** (MurmurHash3) | /game/a1b2c3, optional OG image |

---

## 5. Module Bỏ (8 Module)

| # | Module | Lý do bỏ |
|---|--------|----------|
| 2 | Maia Chess | Cần GPU, không chạy WASM |
| 3 | Lc0 | Cần GPU, không chạy WASM |
| 9 | Hồ sơ Lối chơi (3 trục) | Cần 5+ ván, 1 ván = không ổn định |
| 11 | GM Match-up | Phụ thuộc persona, không standalone |
| 12 | Resilience Score | Cần nhiều ván bị áp đảo |
| 16 | Hidden Threat Scanner | Null-move phức tạp, ít giá trị demo |
| 20 | Multi-line Depth | MultiPV=3 đủ, không cần nhãn tính cách |
| 22 | Cross-Game Pattern | Cần lưu nhiều ván, demo không có |
| 23 | Real-time WebSocket | Quá phức tạp cho demo |

---

## 6. Database Schema

> **Chỉ khi user chọn "Lưu"** — mặc định không bắt buộc

### Bảng Giữ Lại

```sql
-- games: Chỉ lưu khi user chủ động chọn
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pgn TEXT NOT NULL,
    white_name TEXT,
    black_name TEXT,
    white_elo INT,
    black_elo INT,
    result TEXT,
    date DATE,
    accuracy_white FLOAT,
    accuracy_black FLOAT,
    opening_name TEXT,
    opening_eco TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- sm2_cards: Chỉ lưu khi user đăng nhập + lưu ván
CREATE TABLE sm2_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    fen TEXT NOT NULL,
    solution TEXT[] NOT NULL,
    theme TEXT NOT NULL,
    repetition INT DEFAULT 0,
    easiness_factor FLOAT DEFAULT 2.5,
    interval_days INT DEFAULT 1,
    next_review DATE DEFAULT CURRENT_DATE,
    last_reviewed TIMESTAMP,
    quality_score INT CHECK (quality_score BETWEEN 0 AND 5),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Bảng Bỏ

| Bảng | Lý do bỏ |
|------|----------|
| `analysis_moves` | Quá lớn, 40 nước × 2.7KB = 108KB/ván. Tính client-side, không lưu. |
| `gm_vectors` | Bỏ GM Match-up |
| `user_profiles` | Bỏ cross-game pattern |
| `weakness_profiles` | Bỏ persona |

### Triggers (SM-2 Auto-Update)

```sql
CREATE OR REPLACE FUNCTION sm2_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quality_score < 3 THEN
        NEW.repetition := 0;
        NEW.interval_days := 1;
    ELSE
        NEW.easiness_factor := GREATEST(
            NEW.easiness_factor + (0.1 - (5 - NEW.quality_score) * (0.08 + (5 - NEW.quality_score) * 0.02)),
            1.3
        );
        IF NEW.repetition = 0 THEN NEW.interval_days := 1;
        ELSIF NEW.repetition = 1 THEN NEW.interval_days := 6;
        ELSE NEW.interval_days := ROUND(NEW.interval_days * NEW.easiness_factor);
        END IF;
        NEW.repetition := NEW.repetition + 1;
    END IF;
    NEW.next_review := CURRENT_DATE + NEW.interval_days;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sm2_trigger
BEFORE UPDATE ON sm2_cards
FOR EACH ROW
EXECUTE FUNCTION sm2_update();
```

### Row Level Security (RLS)

```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own games"
ON games FOR ALL
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE sm2_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own cards"
ON sm2_cards FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

---

## 7. API Routes

| Route | Method | Chức năng | Auth |
|-------|--------|-----------|------|
| `/api/syzygy` | GET | Proxy Lichess tablebase | Không |
| `/api/games` | POST | Lưu ván (chỉ khi user chọn) | Required |
| `/api/games` | GET | List ván đã lưu | Required |
| `/api/puzzles` | POST | Tạo puzzle từ blunder | Required |
| `/api/puzzles` | GET | Lấy puzzle due | Required |

**Bỏ:**
- `/api/analyze` → Stockfish chạy browser, không cần API
- `/api/profile` → Bỏ persona
- `/api/games/[id]/share` → Dùng short hash thay vì DB

---

## 8. Frontend Pages

| Route | Mô tả | Auth |
|-------|-------|------|
| `/` | Landing page + **demo ván mẫu** | Không |
| `/game/[hash]` | Xem kết quả (short hash) | Không |
| `/dashboard` | List ván đã lưu | Required |
| `/puzzles` | SM-2 puzzle due | Optional |
| `/login` | Đăng nhập | Không |

**Bỏ:**
- `/profile` → Bỏ persona
- `/settings` → Giảm phức tạp

---

## 9. UX Update (8 Cải Thiện)

### UPDATE 1: Progressive Analysis (P0)

**Vấn đề:** User chờ 3-5 giây, màn hình trắng, không biết gì đang xảy ra.

**Giải pháp:**
- Stockfish WASM chạy **Web Worker** (không block UI)
- Post message từng nước về main thread
- Chart append data từng điểm
- User thấy kết quả **ngay lập tức**, không chờ hết

```
Upload PGN
    │
    ▼
[Hiển thị board ngay — chưa có eval]
    │
    ▼
[Nước 1 eval xong → vẽ nước 1]
[Nước 2 eval xong → vẽ nước 2]
...
[Nước 40 → hoàn tất, hiện 9-label + narrative + puzzle]
```

**UI:**
```
┌─────────────────────────────────────────┐
│  [Board — hiện ngay]                    │
│  [Chart — vẽ dần ▓▓▓░░░]                │
│  [Progress: Nước 23/40 — ~2 giây còn]   │
│  [Cancel]                               │
└─────────────────────────────────────────┘
```

---

### UPDATE 2: Web Worker (P0)

**Vấn đề:** Stockfish chạy main thread → UI đơ, không scroll được.

**Giải pháp:**
```javascript
// worker.js
self.onmessage = (e) => {
  const { fen, depth } = e.data;
  stockfish.postMessage(`position fen ${fen}`);
  stockfish.postMessage(`go depth ${depth}`);
  stockfish.onMessage = (line) => {
    if (line.includes('bestmove')) {
      self.postMessage({ result: parseLine(line) });
    }
  };
};
```

**Lợi ích:**
- UI mượt, scroll thoải mái
- Cancel được (terminate worker)
- Multiple workers (phân tích nhiều ván)

---

### UPDATE 3: Mobile Bottom Sheet (P0)

**Vấn đề:** Desktop layout không vừa mobile, nút nhỏ, chart che board.

**Giải pháp:**
```
┌─────────────────────┐
│                     │
│   [Board 70%]       │
│   [Swipe ← →]       │
│                     │
├─────────────────────┤
│  ▲ [Kéo lên]        │
│  ├─ Eval mini       │
│  ├─ 9-Label         │
│  ├─ Narrative       │
│  ├─ Puzzle          │
│  └─ Share           │
└─────────────────────┘
```

**Chi tiết:**
- Board chiếm 70% màn hình
- Swipe left/right đi nước (thay ◀ ▶)
- Bottom sheet kéo lên xem chi tiết
- Stockfish depth 15 trên mobile (nhanh hơn)

---

### UPDATE 4: Demo Ván Mẫu (P0)

**Vấn đề:** User mở app lần đầu, không biết upload gì, không thấy giá trị.

**Giải pháp:** Mở app thấy ván phân tích sẵn + tooltip hướng dẫn.

**5 ván mẫu:**

| Ván | Đặc điểm | Dạy user gì |
|-----|----------|-------------|
| Carlsen vs Shevchenko | Blunder nước 23 | Nhìn chart drop |
| Tal vs Botvinnik 1960 | Brilliant sacrifice | Nhãn !! |
| Morphy vs Duke 1858 | Quick tactical | Tốc độ |
| Kasparov vs Karpov 1985 | Endgame resilience | Resilience |
| Beginner game | Nhiều blunder | 9-label đỏ rực |

---

### UPDATE 5: Progress Bar + Cancel (P1)

**Vấn đề:** Không biết còn bao lâu, muốn dừng không được.

**Giải pháp:**
```
┌─────────────────────────────────────────┐
│  Phân tích ván cờ...                   │
│  [████████████░░░░░░] 60%              │
│  Nước 24/40 — ~2 giây còn              │
│  [Hủy]                                 │
└─────────────────────────────────────────┘
```

- Estimated time: `(nước còn lại) × (avg time/nước)`
- Cancel: `worker.terminate()`, hiện kết quả partial

---

### UPDATE 6: Short Hash Share (P1)

**Vấn đề:** URL hash chứa PGN dài 2-5KB, khó copy, xấu.

**Giải pháp:**

| Trước | Sau |
|-------|-----|
| `/game/#rnbqkbnr/pppppppp/...` (2KB) | `/game/a1b2c3` (6 chars) |

**Cách làm:**
- Hash PGN bằng **MurmurHash3** (fast, 32-bit)
- Lưu mapping `hash → PGN` trong **localStorage** (sender)
- Receiver mở link, nếu không có PGN → prompt "Ván này chỉ lưu trên máy người gửi"

**Hoặc (cần database):** Lưu `hash → PGN` trong Supabase, TTL 30 ngày.

---

### UPDATE 7: OG Image Share (P1)

**Vấn đề:** Share Facebook/Twitter chỉ hiện link text, không hấp dẫn.

**Giải pháp:**
```
Share → 
├── Link
├── Tweet (auto text + OG image)
└── OG image: Board screenshot + Accuracy + 9-label summary
```

**Triển khai đơn giản:**
- HTML Canvas vẽ board ở nước critical (blunder/brilliant)
- Thêm text: "Accuracy 92% | 1 Blunder | V-Max Analysis"
- Data URL → meta tag `og:image`

---

### UPDATE 8: Graceful Degrade + Skeleton (P1)

**Vấn đề:** Timeout, lỗi PGN, offline = màn hình trắng hoặc crash.

**Giải pháp:**

| Tình huống | Graceful degrade |
|------------|------------------|
| Stockfish timeout (10s) | "Phân tích depth 15 thay vì 20 — vẫn chính xác 95%" |
| Invalid PGN | Highlight dòng lỗi, suggest: "Thiếu nước 12...O-O?" |
| Offline | "Bạn đang offline. Phân tích depth 10 tạm thời." |
| Browser không hỗ trợ WASM | "Dùng phiên bản đơn giản (depth 15 server-side)" |
| Mobile RAM thấp | "Giảm depth xuống 15 để ổn định" |

**Skeleton loading:**
```
┌─────────────────────────────────────────┐
│  [████░░░░░░] Đang phân tích...        │
│  ┌─────────┐  ┌─────────────────────┐   │
│  │ ░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────┘  └─────────────────────┘   │
│  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]    │
│  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]    │
└─────────────────────────────────────────┘
```

---

## 10. UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Header: V-Max Logo | Dashboard | Puzzles | Login]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │             │  │  [Eval Sparkline SVG — progressive] │  │
│  │   BOARD     │  │  +5.0 │    ██                      │  │
│  │  (chess-    │  │  +1.0 │ ██ ██  ██                  │  │
│  │   ground)   │  │   0.0 │──────────────────────      │  │
│  │  [Heatmap   │  │  -1.0 │           ██  ██           │  │
│  │   overlay]  │  │  -3.0 │              ██  ██  ██    │  │
│  │             │  │       │ 1  5  10  15  20  25  30   │  │
│  └─────────────┘  └─────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [9-Label Table]                                         │ │
│  │  Brilliant  1  !!  |  Critical  1  !  |  Best  20  ★   │ │
│  │  ...                                                    │ │
│  │  Accuracy: 92.2% vs 91.1%                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Template Narrative]                                    │ │
│  │  "Nước 23. Tượng×f6!! là một nước thí sắc bén..."      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Tilt Detector] ⚠️ Phát hiện tilt sau nước 20           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Puzzle từ ván này]  [Guess the Move]  [Share]         │ │
│  │  💾 [Lưu để ôn tập sau] ← chỉ hiện nếu chưa đăng nhập   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  [Navigation: ◀  ▶  ⏵  ⏭  |  Move: 23/40]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Roadmap 4 Tuần

### Tuần 1: Core + Progressive

| Ngày | Task | Output |
|------|------|--------|
| 1 | Setup Next.js + Tailwind + shadcn/ui | Repo chạy |
| 2 | Web Worker + Stockfish WASM | Không block UI |
| 3 | Progressive analysis (streaming) | Chart vẽ dần |
| 4 | Progress bar + cancel | UX chờ đợi |
| 5 | Skeleton loading | Không màn hình trắng |
| 6 | Graceful degrade | Timeout, lỗi PGN |
| 7 | Demo ván mẫu (5 ván) | Mở app thấy ngay |

### Tuần 2: Features + Mobile

| Ngày | Task | Output |
|------|------|--------|
| 8 | chessground board + heatmap | Board hiển thị |
| 9 | Mobile bottom sheet | Swipe, kéo lên |
| 10 | PGN parser + 9-label | Upload → phân tích |
| 11 | Eval chart (Recharts) | Interactive |
| 12 | Time management timeline | SVG |
| 13 | Template narrative | 100 template |
| 14 | Tilt detector | Chuỗi nước xấu |

### Tuần 3: Tactical + Share

| Ngày | Task | Output |
|------|------|--------|
| 15 | Pawn structure | Doubled, Isolated |
| 16 | Tactics tracker | Fork, Pin, Skewer |
| 17 | Puzzle generator | Trích blunder |
| 18 | Guess the move | Interactive pause |
| 19 | Short hash share | /game/a1b2c3 |
| 20 | OG image | Canvas screenshot |
| 21 | Syzygy proxy | Lichess API |

### Tuần 4: SM-2 + Deploy

| Ngày | Task | Output |
|------|------|--------|
| 22 | SM-2 localStorage | Lưu schedule |
| 23 | SM-2 UI (due today) | Puzzle cần ôn |
| 24 | Supabase setup (Auth, DB) | Đăng nhập tùy chọn |
| 25 | Lưu ván tùy chọn | Chỉ khi user chọn |
| 26 | Responsive polish | Mobile + desktop |
| 27 | Dark mode | Như WintrChess |
| 28 | Deploy Vercel + test | Production URL |

---

## 12. Chi Phí

| Thành phần | Nền tảng | Chi phí |
|------------|----------|---------|
| Frontend + API | Vercel Hobby | $0 |
| Database (nếu dùng) | Supabase Free | $0 |
| Storage (nếu dùng) | Supabase Free 1GB | $0 |
| Engine | Stockfish WASM (browser) | $0 |
| API calls | Lichess API | $0 |
| **TỔNG** | | **$0** |

**Giới hạn free:**
- 500MB database → ~10,000 ván (nếu lưu)
- 1GB storage → ~50,000 file PGN
- 50K users auth → đủ 1 năm
- 500K Edge Function invocations → ~16K/ngày

---

## 13. So Sánh Với WintrChess

| | WintrChess | V-Max v3.0 |
|---|---|---|
| **Giá** | Free | Free |
| **Tốc độ hiển thị** | Chờ hết ván | **Progressive — thấy ngay** |
| **UI block khi phân tích** | Có | **Không — Web Worker** |
| **Mobile** | Responsive | **Bottom sheet, swipe** |
| **Onboarding** | Tự tìm hiểu | **5 ván mẫu sẵn** |
| **Progress chờ** | Không | **Có, với cancel** |
| **Share link** | Đẹp | **Short hash + OG image** |
| **Lỗi/timeout** | Crash hoặc treo | **Graceful degrade** |
| **9-label** | ✅ | ✅ |
| **Eval chart** | ✅ | ✅ + hover |
| **Heatmap** | ❌ | ✅ |
| **Time timeline** | ❌ | ✅ |
| **Tilt detector** | ❌ | ✅ |
| **Puzzle** | ❌ | ✅ |
| **SM-2** | ❌ | ✅ (localStorage) |
| **Narrative** | ❌ | ✅ (template) |
| **Persona / GM Match-up** | ❌ | ❌ **Bỏ** |
| **Cross-game pattern** | ❌ | ❌ **Bỏ** |
| **Real-time** | ❌ | ❌ **Bỏ** |
| **Auth** | Có | ✅ Tùy chọn |
| **Sync devices** | Có | ✅ Nếu đăng nhập |

**Differentiation:** Tốc độ cảm nhận + mobile UX + learning cơ bản. Không cạnh tranh persona/social.

---

## 14. Tóm Tắt

> **V-Max v3.0 = phân tích cờ vua miễn phí, progressive hiển thị từng nước, không block UI, mobile swipe, 5 ván mẫu sẵn, short hash share, graceful degrade. 15 module core, bỏ persona/Lc0/Maia/real-time. Triển khai 4 tuần, $0. Khác WintrChess ở tốc độ cảm nhận và mobile UX.**

---

*Kế hoạch được tổng hợp từ đánh giá v2.0, benchmark WintrChess, và tinh gọn cho demo free trên Vercel.*
