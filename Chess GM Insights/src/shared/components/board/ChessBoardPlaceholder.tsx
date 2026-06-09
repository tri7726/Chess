const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

export function ChessBoardPlaceholder() {
  return (
    <div className="w-full">
      <div
        id="chessboard"
        className="relative grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-border shadow-xl"
      >
        {RANKS.map((rank, r) =>
          FILES.map((file, f) => {
            const isLight = (r + f) % 2 === 0;
            return (
              <div
                key={`${file}${rank}`}
                className="relative flex items-center justify-center text-[10px] font-medium"
                style={{ backgroundColor: isLight ? "var(--color-board-light)" : "var(--color-board-dark)" }}
              >
                {f === 0 && (
                  <span
                    className="absolute left-1 top-0.5"
                    style={{ color: isLight ? "var(--color-board-dark)" : "var(--color-board-light)" }}
                  >
                    {rank}
                  </span>
                )}
                {r === 7 && (
                  <span
                    className="absolute bottom-0.5 right-1"
                    style={{ color: isLight ? "var(--color-board-dark)" : "var(--color-board-light)" }}
                  >
                    {file}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
