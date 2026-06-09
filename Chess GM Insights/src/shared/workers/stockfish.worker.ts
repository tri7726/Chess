/**
 * Stockfish Web Worker — Fix: correct CDN URL + consistent addMessageListener API
 */

// importScripts is available in Web Worker scope but not declared in module-mode TS
declare function importScripts(...urls: string[]): void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sf: any = null;

export interface MultiPVLine {
  multipv: number;
  bestMove: string;
  cp: number;
  mate: number | null;
  depth: number;
  pv: string[];
}

export interface EvalRequest {
  id: string;
  fen: string;
  depth: number;
  multipv?: number;
  skillLevel?: number;
}

export interface EvalResult {
  id: string;
  fen: string;
  bestMove: string;
  cp: number;
  mate: number | null;
  depth: number;
  pv: string[];
  lines?: MultiPVLine[];
  error?: string;
}

let currentId = "";
let currentFen = "";
let bestMoveSeen = "";
let cpSeen = 0;
let mateSeen: number | null = null;
let depthSeen = 0;
let pvSeen: string[] = [];
let linesSeen: MultiPVLine[] = [];

function handleLine(line: string) {
  if (line.startsWith("info") && line.includes("depth")) {
    const depthM = line.match(/depth (\d+)/);
    const cpM = line.match(/score cp (-?\d+)/);
    const mateM = line.match(/score mate (-?\d+)/);
    const pvM = line.match(/ pv (.+)/);
    const multipvM = line.match(/multipv (\d+)/);

    let depth = depthM ? parseInt(depthM[1]) : depthSeen;
    let cp = cpM ? parseInt(cpM[1]) : cpSeen;
    let mate: number | null = mateM ? parseInt(mateM[1]) : null;
    if (mateM && mate !== null) {
      cp = mate > 0 ? 30000 : -30000;
    }
    let pv = pvM ? pvM[1].trim().split(" ") : [];

    if (multipvM) {
      const mvIndex = parseInt(multipvM[1]);
      const mvBestMove = pv[0] ?? "";
      
      const newLineData: MultiPVLine = {
        multipv: mvIndex,
        bestMove: mvBestMove,
        cp,
        mate,
        depth,
        pv
      };
      
      const existingIdx = linesSeen.findIndex(l => l.multipv === mvIndex);
      if (existingIdx !== -1) {
        linesSeen[existingIdx] = newLineData;
      } else {
        linesSeen.push(newLineData);
      }
    } else {
      if (depthM) depthSeen = depth;
      if (cpM) { cpSeen = cp; mateSeen = null; }
      if (mateM) { mateSeen = mate; cpSeen = cp; }
      if (pvM) pvSeen = pv;
    }
  }

  if (line.startsWith("bestmove")) {
    bestMoveSeen = line.split(" ")[1] ?? "";
    
    // Sort linesSeen by multipv index
    linesSeen.sort((a, b) => a.multipv - b.multipv);

    const turn = currentFen.split(" ")[1] || "w";
    const sign = turn === "w" ? 1 : -1;

    let finalCp = cpSeen;
    let finalMate = mateSeen;
    let finalDepth = depthSeen;
    let finalPv = pvSeen;

    if (linesSeen.length > 0 && linesSeen[0].multipv === 1) {
      finalCp = linesSeen[0].cp;
      finalMate = linesSeen[0].mate;
      finalDepth = linesSeen[0].depth;
      finalPv = linesSeen[0].pv;
    }

    const result: EvalResult = {
      id: currentId,
      fen: currentFen,
      bestMove: bestMoveSeen,
      cp: finalCp * sign,
      mate: finalMate !== null ? finalMate * sign : null,
      depth: finalDepth,
      pv: finalPv,
      lines: linesSeen.length > 0 ? linesSeen.map(l => ({ ...l, cp: l.cp * sign, mate: l.mate !== null ? l.mate * sign : null })) : undefined,
    };
    self.postMessage(result);
  }
}

function initEngine(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Define a dummy exports object so that the Emscripten module assigns Stockfish to it
    // @ts-ignore
    self.exports = {};

    let loaded = false;
    const urls = [
      "/stockfish-18-lite-single.js",
      "https://cdn.jsdelivr.net/npm/stockfish@18.0.7/src/stockfish-18-lite-single.js",
      "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js"
    ];

    for (const url of urls) {
      try {
        importScripts(url);
        // @ts-ignore
        const ctor = self.exports?.Stockfish || self.Stockfish;
        if (ctor) {
          sf = ctor();
          loaded = true;
          break;
        }
      } catch (err) {
        console.warn(`Failed to load Stockfish from ${url}:`, err);
      }
    }

    if (!loaded || !sf) {
      reject(new Error("Could not initialize Stockfish engine from any source."));
      return;
    }

    try {
      sf.addMessageListener((line: string) => handleLine(line));
      sf.postMessage("uci");
      sf.postMessage("isready");
      // Wait for readyok
      const readyHandler = (line: string) => {
        if (line === "readyok") {
          sf.removeMessageListener(readyHandler);
          resolve();
        }
      };
      sf.addMessageListener(readyHandler);
    } catch (e) {
      reject(e);
    }
  });
}
self.onmessage = async (e: MessageEvent<EvalRequest>) => {
  const { id, fen, depth, multipv, skillLevel } = e.data;

  if (!sf) {
    try {
      await initEngine();
    } catch {
      self.postMessage({
        id, fen, bestMove: "", cp: 0, mate: null, depth: 0, pv: [],
        error: "Stockfish failed to load. Check network or WASM support.",
      } satisfies EvalResult);
      return;
    }
  }

  // Reset state for this request
  currentId = id;
  currentFen = fen;
  bestMoveSeen = "";
  cpSeen = 0;
  mateSeen = null;
  depthSeen = 0;
  pvSeen = [];
  linesSeen = [];

  sf.postMessage("stop");
  sf.postMessage(`setoption name MultiPV value ${multipv ?? 1}`);
  if (skillLevel !== undefined && skillLevel >= 0 && skillLevel <= 20) {
    sf.postMessage(`setoption name Skill Level value ${skillLevel}`);
  } else {
    sf.postMessage(`setoption name Skill Level value 20`);
  }
  sf.postMessage(`position fen ${fen}`);
  sf.postMessage(`go depth ${depth}`);
};
