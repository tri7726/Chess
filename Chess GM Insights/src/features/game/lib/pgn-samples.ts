export const SAMPLE_GAMES: { label: string; pgn: string }[] = [
  {
    label: "Carlsen 2024",
    pgn: `[Event "Sample"]\n[White "Carlsen, M."]\n[Black "Nepomniachtchi, I."]\n[Result "1-0"]\n[Date "2024.01.15"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0`,
  },
  {
    label: "Tal 1960",
    pgn: `[Event "World Ch"]\n[White "Tal, M."]\n[Black "Botvinnik, M."]\n[Result "1-0"]\n[Date "1960.03.15"]\n\n1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 1-0`,
  },
  {
    label: "Morphy 1858",
    pgn: `[Event "Opera"]\n[White "Morphy, P."]\n[Black "Duke of Brunswick"]\n[Result "1-0"]\n[Date "1858.11.02"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 1-0`,
  },
  {
    label: "Kasparov 1985",
    pgn: `[Event "World Ch"]\n[White "Karpov, A."]\n[Black "Kasparov, G."]\n[Result "0-1"]\n[Date "1985.10.15"]\n\n1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 0-1`,
  },
  {
    label: "Beginner",
    pgn: `[Event "Casual"]\n[White "Player A"]\n[Black "Player B"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`,
  },
];

export function hashPgn(pgn: string): string {
  // Simple stable hash → 8 hex chars, no engine required.
  let h = 5381;
  for (let i = 0; i < pgn.length; i++) h = ((h << 5) + h + pgn.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0").slice(0, 8);
}

export function parsePgnHeaders(pgn: string) {
  const headers: Record<string, string> = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn))) headers[m[1]] = m[2];
  return {
    white: headers["White"] ?? null,
    black: headers["Black"] ?? null,
    result: headers["Result"] ?? null,
    date: headers["Date"]?.replace(/\./g, "-").replace(/-\?\?/g, "-01") ?? null,
    opening: headers["Opening"] ?? null,
    eco: headers["ECO"] ?? null,
  };
}
