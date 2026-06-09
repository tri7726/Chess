import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Save, Share2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveGame } from "@/features/game/lib/games.functions";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { UploadModal } from "@/shared/components/pgn/UploadModal";
import { parsePgnHeaders } from "@/features/game/lib/pgn-samples";
import { toast } from "sonner";

export function BottomBar({
  pgn,
  accuracyWhite,
  accuracyBlack,
}: {
  pgn: string;
  accuracyWhite?: number | null;
  accuracyBlack?: number | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveGame);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!pgn) {
      toast.error("No PGN loaded");
      return;
    }
    setSaving(true);
    try {
      const h = parsePgnHeaders(pgn);
      const gameHash = h.white + h.black + h.date + pgn.slice(0, 50);

      // Helper to save locally
      const saveLocally = () => {
        const localGames = JSON.parse(localStorage.getItem("vmax:local_games") || "[]");
        if (localGames.some((g: any) => g.hash === gameHash)) {
          toast.info("Game is already saved locally");
          return false;
        }

        const newLocal = {
          id: `local-${Date.now()}`,
          hash: gameHash,
          pgn,
          white_name: h.white || "White",
          black_name: h.black || "Black",
          result: h.result || "*",
          date: h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date) ? h.date : new Date().toISOString().split("T")[0],
          accuracy_white: accuracyWhite ?? null,
          accuracy_black: accuracyBlack ?? null,
          opening_name: h.opening || "Unknown Opening",
          opening_eco: h.eco || "",
          created_at: new Date().toISOString(),
          isLocal: true,
        };

        localGames.unshift(newLocal);
        localStorage.setItem("vmax:local_games", JSON.stringify(localGames));
        return true;
      };

      if (!user || !navigator.onLine) {
        const ok = saveLocally();
        if (ok) {
          toast.success(!user ? "Game saved locally (Guest mode)" : "Game saved locally (Offline mode)");
        }
      } else {
        await save({ data: { pgn } });
        toast.success("Game saved to your cloud library");
      }
    } catch (e) {
      // Fallback if network function fails
      const localGames = JSON.parse(localStorage.getItem("vmax:local_games") || "[]");
      const h = parsePgnHeaders(pgn);
      const gameHash = h.white + h.black + h.date + pgn.slice(0, 50);

      if (!localGames.some((g: any) => g.hash === gameHash)) {
        const newLocal = {
          id: `local-${Date.now()}`,
          hash: gameHash,
          pgn,
          white_name: h.white || "White",
          black_name: h.black || "Black",
          result: h.result || "*",
          date: h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date) ? h.date : new Date().toISOString().split("T")[0],
          accuracy_white: accuracyWhite ?? null,
          accuracy_black: accuracyBlack ?? null,
          opening_name: h.opening || "Unknown Opening",
          opening_eco: h.eco || "",
          created_at: new Date().toISOString(),
          isLocal: true,
        };
        localGames.unshift(newLocal);
        localStorage.setItem("vmax:local_games", JSON.stringify(localGames));
        toast.success("Saved locally (Server offline)");
      } else {
        toast.info("Game is already saved locally");
      }
    } finally {
      setSaving(false);
    }
  }

  function onShare() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 py-3">
        <Button variant="secondary" onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save Game"}
        </Button>
        <Button variant="secondary" onClick={onShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <UploadModal
          trigger={
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload New PGN
            </Button>
          }
        />
      </div>
    </div>
  );
}
