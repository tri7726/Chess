/**
 * SM-2 Spaced Repetition Algorithm
 * Stores puzzle cards in localStorage (synced to Supabase if user is logged in).
 */

export interface SM2Card {
  id: string;           // unique puzzle id
  gameHash: string;     // which game this came from
  fen: string;          // puzzle starting position
  solution: string[];   // UCI moves (e.g. ["d5e7", "f6e4"])
  theme: string;        // "blunder_recovery" | "fork" | "pin" | "skewer" | "tactical"
  // SM-2 fields
  repetition: number;
  easinessFactor: number; // default 2.5
  intervalDays: number;   // default 1
  nextReview: string;     // ISO date string YYYY-MM-DD
  lastReviewed?: string;
  qualityScore?: number;  // 0-5 last score
}

const STORAGE_KEY = "vmax:sm2:cards";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function loadCards(): SM2Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCards(cards: SM2Card[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // quota exceeded — remove oldest cards
    const trimmed = cards.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function addCard(card: Omit<SM2Card, "repetition" | "easinessFactor" | "intervalDays" | "nextReview">): SM2Card {
  const cards = loadCards();
  // Don't add duplicates
  if (cards.some((c) => c.id === card.id)) return cards.find((c) => c.id === card.id)!;

  const newCard: SM2Card = {
    ...card,
    repetition: 0,
    easinessFactor: 2.5,
    intervalDays: 1,
    nextReview: today(),
  };

  cards.push(newCard);
  saveCards(cards);
  return newCard;
}

/** Apply SM-2 algorithm after a review. quality: 0 (complete fail) → 5 (perfect) */
export function reviewCard(id: string, quality: number): SM2Card | null {
  const cards = loadCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const card = { ...cards[idx] };

  // SM-2 algorithm
  if (quality < 3) {
    // Failed — reset to start
    card.repetition = 0;
    card.intervalDays = 1;
  } else {
    // Update easiness factor
    card.easinessFactor = Math.max(
      1.3,
      card.easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );

    if (card.repetition === 0) {
      card.intervalDays = 1;
    } else if (card.repetition === 1) {
      card.intervalDays = 6;
    } else {
      card.intervalDays = Math.round(card.intervalDays * card.easinessFactor);
    }
    card.repetition++;
  }

  card.nextReview = addDays(today(), quality < 3 ? 0 : card.intervalDays);
  card.lastReviewed = new Date().toISOString();
  card.qualityScore = quality;

  cards[idx] = card;
  saveCards(cards);
  return card;
}

/** Get cards due today or overdue */
export function getDueCards(): SM2Card[] {
  const t = today();
  return loadCards().filter((c) => c.nextReview <= t);
}

/** Get cards for a specific game */
export function getCardsForGame(gameHash: string): SM2Card[] {
  return loadCards().filter((c) => c.gameHash === gameHash);
}

export function deleteCard(id: string): void {
  const cards = loadCards().filter((c) => c.id !== id);
  saveCards(cards);
}
