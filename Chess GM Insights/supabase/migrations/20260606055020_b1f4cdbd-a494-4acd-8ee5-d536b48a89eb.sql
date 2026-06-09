
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pgn TEXT NOT NULL,
  white_name TEXT,
  black_name TEXT,
  result TEXT,
  date DATE,
  accuracy_white FLOAT,
  accuracy_black FLOAT,
  opening_name TEXT,
  opening_eco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own games only" ON public.games FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.sm2_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  fen TEXT NOT NULL,
  solution TEXT[] NOT NULL,
  theme TEXT NOT NULL,
  repetition INT NOT NULL DEFAULT 0,
  easiness_factor FLOAT NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 1,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sm2_cards TO authenticated;
GRANT ALL ON public.sm2_cards TO service_role;
ALTER TABLE public.sm2_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cards only" ON public.sm2_cards FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX games_user_created_idx ON public.games(user_id, created_at DESC);
CREATE INDEX sm2_user_review_idx ON public.sm2_cards(user_id, next_review);
