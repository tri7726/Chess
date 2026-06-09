<div align="center">

# ♔ V-Max Chess Analysis Platform
**Nền tảng Phân tích & Huấn luyện Cờ vua AI Chuyên Nghiệp**

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%2018%20NNUE-green.svg)](https://stockfishchess.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC.svg)](https://tailwindcss.com/)

</div>

---

## 📖 Mục lục (Table of Contents)
1. [Giới thiệu Chung (Overview)](#1-giới-thiệu-chung-overview)
2. [Chi tiết Kiến trúc Hệ thống (Architecture)](#2-chi-tiết-kiến-trúc-hệ-thống-architecture)
3. [Thuật toán Đánh giá Nước đi (Evaluation Algorithms)](#3-thuật-toán-đánh-giá-nước-đi-evaluation-algorithms)
4. [Mô hình AI Huấn luyện viên (AI Coach)](#4-mô-hình-ai-huấn-luyện-viên-ai-coach)
5. [Hướng dẫn Cài đặt Cục bộ (Local Setup)](#5-hướng-dẫn-cài-đặt-cục-bộ-local-setup)
6. [Hướng dẫn Sử dụng (User Guide)](#6-hướng-dẫn-sử-dụng-user-guide)
7. [Lộ trình Phát triển (Roadmap)](#7-lộ-trình-phát-triển-roadmap)

---

## 1. Giới thiệu Chung (Overview)

**V-Max Chess** (mã nguồn đặt tại thư mục `Chess GM Insights`) không chỉ là một bàn cờ web đơn giản. Nó là một cỗ máy mô phỏng chính xác hệ thống Game Review phức tạp của Chess.com và Lichess, dành riêng cho những kỳ thủ muốn thấu hiểu triệt để từng điểm mạnh yếu trong ván cờ của mình.

Dự án kết hợp sức mạnh tính toán thô của **Stockfish 18 NNUE** với khả năng tư duy ngôn ngữ của **LLM (Large Language Models)** nhằm mang lại trải nghiệm huấn luyện 1-kèm-1 (One-on-one Coaching) tự động hoàn toàn.

---

## 2. Chi tiết Kiến trúc Hệ thống (Architecture)

Hệ thống được thiết kế theo mô hình Micro-frontend & Web Worker chạy ngầm để đảm bảo hiệu năng 60 FPS bất chấp khối lượng tính toán khổng lồ.

### A. Engine Pool (Quản lý luồng Stockfish)
- Thay vì chặn luồng chính (Main Thread) của trình duyệt, hệ thống spawn ra một mảng các **Web Workers** (`stockfish.worker.ts`).
- **Batching & Chunking:** Tệp PGN khi được tải lên sẽ được băm (parse) thành một mảng các `fen`. Mảng này được chia thành các lô (batch) từ 2-4 nước đi và đẩy vào Engine Pool.
- **Tính năng Đa luồng (MultiPV & Depth):** Mỗi Worker chạy lệnh `go depth 18` kết hợp `MultiPV 2` để không chỉ tìm nước đi xuất sắc nhất, mà còn tìm nước đi tốt thứ hai nhằm tính toán độ phức tạp của thế cờ (Criticality).
- **Absolute Normalization:** Để khắc phục hạn chế truyền thống của UCI protocol (điểm `cp` phụ thuộc vào bên chuẩn bị đi), Worker đã được tiêm thuật toán chuẩn hóa: Mọi điểm `cp` và `mate` trả về React đều được quy đổi tuyệt đối về góc nhìn của Trắng.

### B. UI / UX & Rendering
- **Bàn cờ `chessground`:** Sử dụng thư viện `chessground` gốc với custom SVG injection để có các hiệu ứng mũi tên, highlight vùng đi (Glassmorphism highlight).
- **Đồ thị Evaluation (Recharts):** Render đồ thị lợi thế phẳng theo thời gian thực dọc theo trục tọa độ (Y-axis giới hạn từ -6 đến +6 pawns).

---

## 3. Thuật toán Đánh giá Nước đi (Evaluation Algorithms)

V-Max Chess tự hào sở hữu hệ thống dán nhãn nước đi tinh vi, sử dụng công thức chuyển đổi **Centipawn (CP) sang Win Probability (WP)** (tỷ lệ thắng) được hiệu chuẩn từ hàng triệu ván cờ Lichess.

### Công thức Tính Tỷ lệ thắng (WP)
```typescript
function winProb(cp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}
```

### Tiêu chuẩn Phân loại Nước đi (Move Classification Matrix)
Hệ thống tính toán biến số `delta` (Độ hao hụt điểm lợi thế sau khi đi cờ) để dán nhãn:
1. 📖 **Book (Lý thuyết):** Nằm trong 12 plies đầu tiên, duy trì thế trận cân bằng (`Math.abs(eval) <= 80`) và không sụt giảm lợi thế.
2. ‼ **Brilliant (Thiên tài):** Là nước đi tốt nhất do Engine đề xuất, mang tính chất "hy sinh" (Sacrifice) quân có giá trị cao nhưng làm tăng đột biến Win Probability.
3. ★ **Best (Tuyệt vời):** Hoàn toàn khớp với đề xuất #1 của Stockfish.
4. 👍 **Excellent (Rất tốt):** Mất đi không quá 0.1 pawns (`delta <= 10`).
5. ✓ **Good (Tốt):** Mất đi không quá 0.3 pawns (`delta <= 30`).
6. ?! **Inaccuracy (Không chính xác):** Mất đi từ 0.6 đến 1.2 pawns.
7. ❓ **Mistake (Lỗi):** Mất đi từ 1.2 đến 2.0 pawns.
8. ⁇ **Blunder (Lỗi nặng):** Điểm sụt giảm kinh hoàng (>2.0 pawns) trong một thế cờ mà người chơi đáng lẽ có thể kiểm soát.

---

## 4. Mô hình AI Huấn luyện viên (AI Coach)

Trái tim của tính năng huấn luyện nằm ở **Data-Grounded LLM Coaching Pipeline**.

- Tránh tình trạng AI "Hallucination" (ảo giác, nói nhảm nước cờ không có thực), hệ thống không cho phép AI tự tính toán logic cờ vua.
- Trình phân tích `detectTactics` quét qua PGN và xuất ra metadata: (Ví dụ: `Fork detected at e5`, `Pin discovered against King`).
- Metadata này cùng với `eval` được tiêm thẳng vào **System Prompt** của AI. AI lúc này chỉ đóng vai trò là một "biên dịch viên", dùng ngôn từ sư phạm mềm mỏng để giải thích metadata thô thiển của Stockfish cho người dùng hiểu.

---

## 5. Hướng dẫn Cài đặt Cục bộ (Local Setup)

### Yêu cầu cấu hình:
- Node.js (v18+).
- Git.
- Một tài khoản Supabase (Tùy chọn nếu muốn lưu trữ ván cờ lên mây).
- API Key của Groq (Llama-3) hoặc Google Gemini.

### Các bước Cài đặt:
```bash
# 1. Tải bộ mã nguồn từ Github
git clone https://github.com/tri7726/Chess.git
cd Chess/"Chess GM Insights"

# 2. Cài đặt toàn bộ thư viện NPM
npm install

# 3. Môi trường phát triển (Environment Variables)
# - Sao chép file .env.example thành .env
# - Mở file .env và điền các khóa bí mật của bạn:
# VITE_GROQ_API_KEY=gsk_xxx
# VITE_GEMINI_API_KEY=AIza_xxx
cp .env.example .env

# 4. Khởi động Vite Development Server
npm run dev
```

---

## 6. Hướng dẫn Sử dụng (User Guide)

1. **Upload Game (Tải ván cờ):** 
   - Nhấn nút `Upload New PGN` ở góc phải màn hình.
   - Paste đoạn PGN chuẩn từ Chess.com hoặc Lichess vào. 
   - *Lưu ý:* Hệ thống sẽ tự bóc tách `[TimeControl]` để phân tích áp lực thời gian của bạn (Rushed / Calculation Error).
2. **Quá trình Analyzing:**
   - Hệ thống Web Worker sẽ bắt đầu chia nhỏ ván cờ để Stockfish chạy ngầm. Vui lòng giữ nguyên trình duyệt (khoảng 15-30 giây tùy độ phức tạp của ván cờ).
3. **Đọc Báo cáo:**
   - **Accuracies & Elo Performance:** Đánh giá độ chính xác tổng thể và quy đổi ra mức độ thi đấu (Ví dụ: Chơi như Elo 1800).
   - Click vào bất cứ thanh biểu đồ nào để dịch chuyển bàn cờ ngay lập tức tới khoảnh khắc đó.
   - Nhấn `Hỏi Đại kiện tướng Coach` ở những nước đi màu Đỏ (Blunder) để AI giải thích lỗi sai.

---

## 7. Lộ trình Phát triển (Roadmap)

Dự án vẫn đang được V-Max Team tích cực cải tiến mỗi tuần. Dưới đây là các nâng cấp chuẩn bị ra mắt:

### Phase 1: Mở rộng tính linh hoạt (Sắp tới)
- [ ] Tính năng **Self-Analysis Mode**: Cho phép cầm quân cờ di chuyển tự do trên bàn cờ sau khi phân tích xong để xem điểm `cp` thay đổi theo thời gian thực.
- [ ] Tính năng **Lichess Opening Explorer**: Hiện thị thông số Tỷ lệ Thắng/Hòa/Thua của hàng triệu ván cờ Grandmaster ứng với khai cuộc đang chơi trên bàn.
- [ ] Tính năng **Loading Overlay**: Màn hình chờ vô hiệu hóa click khi đang phân tích để chặn các lỗi UI bất đồng bộ.

### Phase 2: Game Hóa (Gamification)
- [ ] Tích hợp thuật toán lặp lại ngắt quãng (SM-2) để tự động xuất các nước cờ Blunder thành bộ thẻ Flashcard (Puzzles).
- [ ] Multi-tier Subscription (Giới hạn số lần phân tích Depth 18 cho tài khoản Free).

---
*Mã nguồn mở được đóng góp bởi Cộng đồng. Chúc bạn có những phút giây rèn luyện chiến thuật tuyệt vời!*
