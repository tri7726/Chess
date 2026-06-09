import { Chess } from "chess.js";
const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.06.06"]
[Round "?"]
[White "Anonymous4488"]
[Black "pheo77"]
[Result "0-1"]
[TimeControl "600"]
[WhiteElo "484"]
[BlackElo "499"]
[Termination "pheo77 won on time"]
[ECO "C25"]
[EndTime "6:09:14 GMT+0000"]
[Link "https://www.chess.com/game/live/169781894044?move=0"]

1. e4 e5 2. Nc3 f6 3. Bc4 Qe7 4. d3 a6 5. Nf3 b5 6. Bd5 c6 7. Bb3 Bb7 8. Be3 Nh6
9. O-O Ng4 10. h3 Nxe3 11. fxe3 a5 12. a4 b4 13. Ne2 Na6 14. d4 O-O-O 15. d5
cxd5 16. exd5 Qe8 17. e4 d6 18. Bc4 Nc5 19. Bb5 Qg6 20. Bc6 Nxe4 21. Nh4 Qh6 22.
Nf5 Qg5 23. h4 Qg4 24. Bxb7+ Kxb7 25. c3 g6 26. Neg3 Qxd1 27. Rfxd1 gxf5 28.
Nxe4 fxe4 29. cxb4 axb4 30. Rac1 Rc8 31. Ra1 Bh6 32. a5 Ka6 33. Re1 e3 34. b3
Rhg8 35. Rf1 Rgf8 36. Rf5 Rc3 37. Rh5 Bf4 38. Rxh7 Rxb3 39. Rd7 Bg3 40. Kf1 Bxh4
41. Rxd6+ Ka7 42. a6 Rb2 43. Rc6 e2+ 44. Kg1 e1=Q+ 45. Rxe1 Bxe1 46. d6 Bf2+ 47.
Kh2 Bb6 48. d7 Rd2 49. Rxb6 Kxb6 0-1`;

try {
  const chess = new Chess();
  chess.loadPgn(pgn);
  console.log("Loaded plies:", chess.history().length);
} catch(e) {
  console.error("Error:", e);
}
