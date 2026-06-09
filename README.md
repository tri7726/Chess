# ♔ V-Max Chess Analysis Platform

<div align="center">
  <h3><strong>Chuyên gia phân tích cờ vua AI & Đào tạo chiến thuật chuẩn Đại Kiện Tướng</strong></h3>
  <p>Một nền tảng phân tích ván cờ (PGN) chuyên nghiệp, tích hợp engine Stockfish 18 NNUE qua Web Workers, cung cấp những đánh giá chi tiết theo chuẩn Chess.com và sự dẫn dắt chiến thuật từ AI Coach (LLM).</p>
</div>

---

## 🚀 Giới thiệu (Overview)

**V-Max Chess** (thư mục `Chess GM Insights`) là một ứng dụng web mô phỏng trải nghiệm phân tích cờ vua ở cấp độ cao nhất. Thay vì chỉ hiển thị biểu đồ lợi thế đơn thuần, ứng dụng đi sâu vào từng nước đi, chấm điểm độ chính xác (Accuracy), phát hiện các nước cờ Thiên tài (Brilliant), Lỗi nặng (Blunder), và đặc biệt sử dụng **Mô hình Ngôn ngữ Lớn (LLM)** kết hợp dữ liệu chiến thuật để giải thích lý do tại sao một nước cờ lại sai lầm.

## ✨ Các Tính Năng Nổi Bật (Core Features)

- **🧠 Phân tích Đa luồng (Multi-threaded Analysis):** Tích hợp Web Worker chạy ngầm Stockfish 18 / 16 NNUE. Xử lý hàng loạt nước đi cùng lúc (Batching) với độ sâu phân tích (Depth) lên đến 18 mà không làm đơ trình duyệt.
- **🎯 Chấm điểm Chuẩn xác (Accuracy & Classification):** Áp dụng công thức tính tỷ lệ thắng (Win Probability) kiểu CAPS2 của Chess.com. Tự động dán nhãn các nước đi: *Book (Lý thuyết), Brilliant (Thiên tài), Best (Tuyệt vời), Inaccuracy (Không chính xác), Mistake (Lỗi), Blunder (Lỗi nặng).*
- **🤖 Huấn luyện viên AI (Data-Grounded AI Coach):** Không giống các chatbot AI thông thường hay "bịa" nước đi, AI Coach của V-Max được nối thẳng với metadata chiến thuật của Stockfish. AI sẽ giải thích chính xác các đòn ghim (pin), xiên (skewer) hay chiếu bí (mate) có thật trong ván cờ.
- **⚔️ Đấu tập Thích ứng (Adaptive Sparring):** Chế độ đấu tập tự động lấy Elo của người dùng từ PGN và thiết lập độ khó (Skill Level) của Stockfish chênh lệch +150 Elo, tạo ra môi trường rèn luyện hoàn hảo.
- **📊 Bảng Điều Khiển Trực Quan (Interactive UI/UX):** 
  - Biểu đồ lợi thế phẳng (Evaluation Chart).
  - Bàn cờ tùy chỉnh giao diện (Chessground) với mũi tên và vòng sáng (Highlight).
  - Tích hợp âm thanh nước đi chuẩn xác.
- **📚 Tự động Tạo Câu đố (Puzzle Generation & SM-2):** Các nước đi Blunder/Mistake sẽ được tự động lưu lại thành câu đố. Tích hợp thuật toán lặp lại ngắt quãng (Spaced Repetition SM-2) để giúp người chơi học từ sai lầm.

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Frontend:** React 18, Vite, TypeScript.
* **UI & Styling:** Tailwind CSS, Lucide Icons, Shadcn UI, framer-motion (Hiệu ứng mượt mà).
* **Chess Logic & Board:** `chess.js` (xử lý logic, PGN), `chessground` (hiển thị bàn cờ hiệu năng cao).
* **Engine:** Stockfish.js (WASM/JavaScript) giao tiếp qua Web Workers.
* **Backend/Auth:** Supabase, Edge Functions (cho LLM AI Coach).

## 📥 Hướng dẫn Cài đặt & Chạy cục bộ (Local Setup)

Đảm bảo máy tính của bạn đã cài đặt **Node.js** (v18 trở lên).

```bash
# 1. Clone kho lưu trữ
git clone https://github.com/tri7726/Chess.git
cd Chess/"Chess GM Insights"

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Cấu hình biến môi trường
# Copy file .env.example thành .env và điền các khóa API của bạn
# Yêu cầu: GROQ_API_KEY hoặc GEMINI_API_KEY cho AI Coach
cp .env.example .env

# 4. Khởi chạy máy chủ phát triển
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:8080` (hoặc một port tương đương do Vite cấp).

## 📂 Cấu trúc Thư mục (Folder Structure)

```text
Chess/
├── Chess GM Insights/
│   ├── src/
│   │   ├── features/       # Các module tính năng (analysis, game, ai-coach, training...)
│   │   ├── routes/         # Hệ thống định tuyến file-based routing
│   │   ├── shared/         # Chứa các component dùng chung (ChessBoard, UI components)
│   │   │   └── workers/    # Nơi chứa stockfish.worker.ts (Engine Pool)
│   │   ├── styles.css      # CSS cấu hình màu sắc, theme bàn cờ, Tailwind
│   │   └── server.ts       # Backend API/Xử lý LLM
│   ├── package.json
│   └── vite.config.ts
└── Upgrade Tracker/        # Chứa tài liệu theo dõi tiến độ, ý tưởng kiến trúc hệ thống
```

## 🐛 Khắc phục Lỗi Thường Gặp (Troubleshooting)

* **Bàn cờ bị tràn viền (Huge SVGs):** Hãy chắc chắn rằng bạn không vô tình xóa các class `cg-wrap`, `cg-board-brown` trong thẻ bọc của `ChessBoard`.
* **Biểu đồ Evaluation nằm phẳng lỳ (Flatline ở 0.0):** Xảy ra khi Web Worker bị timeout. Đảm bảo `timeoutMs` trong `engine-pool.ts` được đặt ít nhất `30000` (30 giây).
* **Quá nhiều nước đi "Excellent" ở đầu ván:** Cấu trúc đã được vá bằng thuật toán Theory (Book). Nếu bạn vẫn thấy lỗi, hãy chắc chắn nhánh code của bạn là mới nhất.

## 🔮 Lộ trình Phát triển (Roadmap)
- [x] Sửa lỗi đồng bộ dữ liệu Stockfish (Góc nhìn Trắng/Đen).
- [x] Tích hợp AI giải thích nước cờ.
- [ ] Chế độ Self-Analysis Mode (Tự do di chuyển quân để xem đánh giá real-time).
- [ ] Tích hợp Lichess Opening Explorer Database.
- [ ] Màn hình chờ (Loading Overlay) mượt mà khi đang Analyzing.

---
*Phát triển và hoàn thiện bởi V-Max Team. Chúc bạn lên tay và sớm đạt cấp độ Đại Kiện Tướng!*
