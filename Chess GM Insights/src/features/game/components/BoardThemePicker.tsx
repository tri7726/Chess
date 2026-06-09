import { useState, useCallback, useEffect } from "react";
import { Palette, Check } from "lucide-react";

export interface BoardTheme {
  id: string;
  name: string;
  boardCss: string;    // chessground CSS class to swap
  pieceCss: string;    // chessground piece CSS class
  lightColor: string;  // CSS hex for light squares (for preview)
  darkColor: string;   // CSS hex for dark squares
}

const THEMES: BoardTheme[] = [
  {
    id: "brown",
    name: "Gỗ Cổ Điển",
    boardCss: "cg-board-brown",
    pieceCss: "cg-piece-cburnett",
    lightColor: "#f0d9b5",
    darkColor: "#b58863",
  },
  {
    id: "blue",
    name: "Đại Dương",
    boardCss: "cg-board-blue",
    pieceCss: "cg-piece-cburnett",
    lightColor: "#dee3e6",
    darkColor: "#8ca2ad",
  },
  {
    id: "green",
    name: "Tươi Mát",
    boardCss: "cg-board-green",
    pieceCss: "cg-piece-cburnett",
    lightColor: "#ffffdd",
    darkColor: "#86a666",
  },
  {
    id: "purple",
    name: "Hoàng Gia",
    boardCss: "cg-board-purple",
    pieceCss: "cg-piece-cburnett",
    lightColor: "#e6d7f5",
    darkColor: "#7c4daa",
  },
  {
    id: "midnight",
    name: "Đêm Tối",
    boardCss: "cg-board-midnight",
    pieceCss: "cg-piece-cburnett",
    lightColor: "#2d3561",
    darkColor: "#1a1f3c",
  },
];

const LS_KEY = "vmax-board-theme";

export function useBoardTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof localStorage === "undefined") return "brown";
    return localStorage.getItem(LS_KEY) ?? "brown";
  });

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  return { theme, setTheme, themes: THEMES };
}

// ─── Mini board preview ───────────────────────────────────────────────────
function ThemePreview({ theme, selected, onClick }: { theme: BoardTheme; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={theme.name}
      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-150 ${
        selected ? "border-primary shadow-lg shadow-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/40"
      }`}
      style={{ width: 56, height: 56 }}
    >
      {/* 2×2 checker preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%" }}>
        <div style={{ background: theme.lightColor }} />
        <div style={{ background: theme.darkColor }} />
        <div style={{ background: theme.darkColor }} />
        <div style={{ background: theme.lightColor }} />
      </div>
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Check className="h-4 w-4 text-white drop-shadow" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 leading-tight truncate px-0.5">
        {theme.name}
      </div>
    </button>
  );
}

// ─── Theme Picker Panel ────────────────────────────────────────────────────
export function BoardThemePicker({
  currentThemeId,
  onSelect,
}: {
  currentThemeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-picker]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" data-theme-picker>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
        title="Thay đổi giao diện bàn cờ"
      >
        <Palette className="h-3.5 w-3.5" />
        <span>Giao diện</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-2xl"
          style={{ minWidth: 220 }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Chủ đề bàn cờ
          </p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <ThemePreview
                key={t.id}
                theme={t}
                selected={t.id === currentThemeId}
                onClick={() => {
                  onSelect(t.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
