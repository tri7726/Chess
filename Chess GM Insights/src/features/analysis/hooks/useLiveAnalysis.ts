import { useEffect, useRef, useState } from "react";
import type { MultiPVLine, EvalResult } from "@/shared/workers/stockfish.worker";

export interface UseLiveAnalysisProps {
  fen: string;
  enabled: boolean;
  depth?: number;
  multipv?: number;
}

const DEBOUNCE_MS = 120; // Wait 120ms before sending to engine — avoids flooding when arrow-key scrolling

export function useLiveAnalysis({
  fen,
  enabled,
  depth = 14,
  multipv = 3,
}: UseLiveAnalysisProps) {
  const [lines, setLines] = useState<MultiPVLine[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize or terminate worker based on enabled state
  useEffect(() => {
    if (!enabled) {
      if (workerRef.current) {
        // FIX: Send stop before terminating to cleanly abort any in-progress search
        workerRef.current.postMessage({ id: "stop", fen: "", depth: 0, stop: true });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setLines([]);
      setIsThinking(false);
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("@/shared/workers/stockfish.worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.addEventListener("message", (e: MessageEvent<EvalResult>) => {
        const data = e.data;
        if (data && data.id === `live_${requestIdRef.current}`) {
          if (data.lines) {
            setLines(data.lines);
          } else {
            // Fallback: if single line returned, wrap it
            setLines([
              {
                multipv: 1,
                bestMove: data.bestMove,
                cp: data.cp,
                mate: data.mate,
                depth: data.depth,
                pv: data.pv,
              },
            ]);
          }
          setIsThinking(false);
        }
      });
    }

    return () => {
      // Don't terminate here on every FEN change, only on unmount or disable
    };
  }, [enabled]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // FIX: Debounced post to worker — prevents flooding engine with rapid FEN changes
  useEffect(() => {
    if (!enabled || !fen) {
      setIsThinking(false);
      return;
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsThinking(true);

    debounceTimerRef.current = setTimeout(() => {
      if (!workerRef.current) return;

      // Increment ID so we ignore any stale response from a previous request
      requestIdRef.current += 1;
      const id = `live_${requestIdRef.current}`;

      workerRef.current.postMessage({ id, fen, depth, multipv });
    }, DEBOUNCE_MS);
  }, [fen, enabled, depth, multipv]);

  return {
    lines,
    isThinking,
  };
}
