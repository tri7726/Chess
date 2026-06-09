import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePgnHeaders } from "./pgn-samples";

export const listMyGames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { games: data ?? [] };
  });

export const saveGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pgn: z.string().min(1).max(200_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const h = parsePgnHeaders(data.pgn);
    const { data: row, error } = await context.supabase
      .from("games")
      .insert({
        user_id: context.userId,
        pgn: data.pgn,
        white_name: h.white,
        black_name: h.black,
        result: h.result,
        date: h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date) ? h.date : null,
        opening_name: h.opening,
        opening_eco: h.eco,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { game: row };
  });

export const getDuePuzzles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("sm2_cards")
      .select("*")
      .lte("next_review", today)
      .order("next_review", { ascending: true });
    if (error) throw new Error(error.message);
    return { puzzles: data ?? [] };
  });
