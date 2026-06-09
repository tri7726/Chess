
# V-Max — Build Plan

Chess game analysis app, UI-complete scaffold. No chess engine, no SM-2 math, no Stockfish — all analysis data flows from props/state and API placeholders return mock data, ready for you to wire real logic later.

## Stack adaptation

- **TanStack Start (React 19 + Vite)** instead of Next.js — same routes, same UI.
- **Lovable Cloud** (managed Supabase) for auth + Postgres.
- **shadcn/ui + Tailwind v4**, dark mode default, Inter font, accent `#7c3aed`, bg `#1a1a2e`.
- **Recharts** for eval chart.
- Email/password auth only (Google deferred).

## Routes (file → URL)

```
src/routes/
  __root.tsx              # nav (V-Max / Dashboard / Puzzles / Login), font + theme, global PGN upload modal trigger
  index.tsx               # / — landing (hero, CTA, 3-feature grid, demo card)
  game.$hash.tsx          # /game/[hash] — split analysis layout
  puzzles.tsx             # /puzzles — public, due-today + puzzle card
  auth.login.tsx          # /auth/login
  auth.register.tsx       # /auth/register
  _authenticated/
    route.tsx             # integration-managed gate (redirects to /auth/login)
    dashboard.tsx         # /dashboard — games table, empty state, pagination
  api/
    games.ts              # GET list, POST save — mock
    puzzles.ts            # GET due puzzles — mock
    syzygy.ts             # GET proxy — empty
```

Notes: TanStack uses `game.$hash.tsx` for `/game/[hash]`. API "routes" are TanStack server routes returning JSON (mock).

## Components

```
src/components/
  layout/Nav.tsx, Footer.tsx
  pgn/UploadModal.tsx           # drag-drop + textarea + 5 sample chips + fake progress bar
  game/
    ChessBoardPlaceholder.tsx   # 8x8 gray grid, a-h/1-8 labels, <div id="chessboard" />
    BoardControls.tsx           # ◀◀ ◀ ▶ ▶▶ + "Move: 0/0" + heatmap toggle
    EvalChart.tsx               # Recharts LineChart, dummy data, red/green segments
    StatsTable.tsx              # 9 labels × White|Black, all 0
    AccuracyRow.tsx
    NarrativeBox.tsx
    TiltDetector.tsx
    MovesList.tsx               # scrollable PGN with colored label badges
    TrainingTab.tsx             # 3 puzzle cards + "Guess the Move" card
    BottomBar.tsx               # Save / Share / Upload New
  puzzles/PuzzleCard.tsx        # board placeholder + 0–5 quality buttons (stubs)
  dashboard/GamesTable.tsx, EmptyState.tsx
  ui/ ...shadcn primitives (tabs, dialog, button, badge, table, progress, sheet, etc.)
```

Mobile: analysis right-panel becomes a shadcn `Sheet` sliding from bottom; board takes full width.

## Backend (Lovable Cloud)

Enable Cloud, then one migration:

- `games` and `sm2_cards` tables exactly as specified.
- RLS enabled, "own rows only" policies for `authenticated`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.games, public.sm2_cards TO authenticated; GRANT ALL TO service_role;` (required by Lovable Cloud's PostgREST setup, your spec didn't include it).

Auth: email/password via Supabase, session listener wired in `__root.tsx`, sign-out hygiene in nav.

## Server functions (replace placeholder REST endpoints)

- `listMyGames` — `requireSupabaseAuth`, returns `[]` for now (table is empty).
- `saveGame` — `requireSupabaseAuth`, inserts row from PGN + parsed headers (header parse only, no engine).
- `getDuePuzzles` — `requireSupabaseAuth`, returns `[]`.
- Server route `/api/public/syzygy` — returns `{ moves: [] }`.

The bottom-bar "Save Game" calls `saveGame`; "Share" copies `window.location.href`.

## Design tokens (src/styles.css)

```
--background: oklch(0.18 0.04 280)   /* ~#1a1a2e */
--primary:    oklch(0.55 0.22 290)   /* ~#7c3aed */
--font-sans:  "Inter", ...
```

Dark class on `<html>` by default. All component colors via tokens.

## Explicitly NOT in scope (per your checklist)

- No Stockfish / chess.js / chessground integration — `#chessboard` div left empty.
- No real SM-2 — quality buttons call `onRate(q)` stubs.
- No tactics detection, no streaming analysis.
- All analysis numbers are dummy/zero, narrative is placeholder italic text.

## After build

GitHub export: top-right → GitHub → Connect, then Code → Download ZIP. Ready for you to layer in Stockfish WASM, chessground, chess.js, real SM-2, and tactics in that order.
