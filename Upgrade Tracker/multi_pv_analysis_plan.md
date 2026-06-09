# 🧩 KẾ HOẠCH CHI TIẾT: CHẾ ĐỘ PHÂN TÍCH ĐA BIẾN THẾ (MULTIPV ANALYSIS PLAN)

Kế hoạch này đặc tả việc nâng cấp động cơ phân tích cờ vua Stockfish Web Worker và tích hợp giao diện vẽ nhiều mũi tên ứng viên (Candidate Moves) song song trực quan trên bàn cờ khi người dùng xem lại ván đấu.

---

## 🎯 1. MỤC TIÊU (GOAL)

*   **Tính năng chính:** Thêm chế độ **"Candidate Moves (Multi-PV)"** cho phép xem 3 nước đi tốt nhất tại thế cờ hiện tại.
*   **Vẽ mũi tên trực quan:**
    *   **Mũi tên xanh lá (Độ ưu tiên 1):** Nước đi mạnh nhất (Best Move).
    *   **Mũi tên xanh lam (Độ ưu tiên 2):** Nước đi tốt nhì.
    *   **Mũi tên cam (Độ ưu tiên 3):** Nước đi tốt thứ ba.
*   **Hộp thoại so sánh:** Hiển thị một bảng nhỏ ở panel phân tích liệt kê danh sách 3 nước đi, điểm đánh giá (Centipawns hoặc Mate) và độ sâu tính toán (Depth).

---

## 🏗️ 2. PHÂN TÍCH DỮ LIỆU TỪ STOCKFISH (UCI MULTIPV PROTOCOL)

Khi cấu hình lệnh `setoption name MultiPV value 3`, Stockfish sẽ xuất ra các dòng thông tin như sau:

```text
info depth 10 seldepth 12 multipv 1 score cp 35 nodes 2341 pv e2e4 e7e5 g1f3
info depth 10 seldepth 12 multipv 2 score cp 12 nodes 2341 pv d2d4 d7d5 c2c4
info depth 10 seldepth 12 multipv 3 score cp -5 nodes 2341 pv g1f3 g7g6 g2g3
```

Chúng ta cần viết bộ lọc Regex để bắt chỉ số `multipv [1-3]`, giá trị điểm `score cp` (hoặc `score mate`) và chuỗi `pv` chứa danh sách nước đi (nước cờ đầu tiên trong chuỗi `pv` chính là nước cờ ứng viên cần vẽ).

---

## 🛠️ 3. LỘ TRÌNH TRIỂN KHAI PHẦN CỨNG (STEP-BY-STEP ROADMAP)

### BƯỚC 1: Cập nhật Web Worker (`stockfish.worker.ts`)
*   **Cấu hình tham số:** Cho phép `EvalRequest` nhận thêm tùy chọn `multipv?: number`.
*   **Bộ lọc dòng:** 
    *   Tạo một mảng lưu trữ tạm thời `lines: MultiPVLine[]`.
    *   Khi nhận dòng chứa `multipv <N>`, phân tích và ghi đè/cập nhật phần tử thứ `N-1` trong mảng.
    *   Khi nhận từ khóa `bestmove`, gửi toàn bộ mảng `lines` về luồng chính.

### BƯỚC 2: Tạo Custom Hook phân tích trực tiếp (`useLiveAnalysis.ts`)
*   Tạo một React Hook chuyên dụng để quản lý một instance Stockfish Web Worker chạy trực tiếp (live engine).
*   Hook này lắng nghe sự thay đổi của thế cờ (`currentFen`). Khi FEN thay đổi:
    1. Gửi lệnh `stop` để ngắt lượt tính toán cũ.
    2. Gửi lệnh `position fen [FEN]` và `setoption name MultiPV value 3`.
    3. Gửi lệnh `go depth 14` (độ sâu vừa phải để phản hồi nhanh trên thiết bị).
*   Lưu kết quả 3 nước đi tốt nhất vào state `liveLines`.

### BƯỚC 3: Vẽ mũi tên lên bàn cờ (`game.$hash.tsx`)
*   Thêm một Toggle Switch **"Candidate Lines (Multi-PV)"** ở cột công cụ bên phải bàn cờ.
*   Khi bật Switch:
    *   Kích hoạt Hook `useLiveAnalysis`.
    *   Duyệt qua danh sách `liveLines` để tạo ra các hình vẽ mũi tên tương ứng cho thuộc tính `customArrows` của bàn cờ `ChessBoard` (sử dụng thư viện `chessground` hoặc SVG tùy chọn).
    *   Màu sắc mũi tên sẽ được gán dựa trên chỉ số `multipv` (Xanh lá -> Xanh lam -> Cam).

### BƯỚC 4: Hiển thị bảng so sánh chi tiết
*   Render một danh sách nhỏ dưới dạng Table bên dưới Eval Bar:
    *   Cột 1: Ký hiệu nước đi (Ví dụ: `1. e4` hoặc `Nf3`).
    *   Cột 2: Điểm đánh giá (`+0.3` hoặc `-0.1`).
    *   Cột 3: Trực quan hóa độ chênh lệch điểm (dưới dạng Progress Bar hoặc Huy hiệu màu tương ứng).

---

## 🎨 4. QUY ƯỚC MÀU SẮC MŨI TÊN (VISUAL PALETTE)

*   **Line 1 (Best Move):** `#22c55e` (Emerald Green - Xanh lục ngọc bảo). Mang lại cảm giác tối ưu nhất.
*   **Line 2 (Second Best):** `#3b82f6` (Royal Blue - Xanh dương hoàng gia). Lựa chọn thay thế chất lượng.
*   **Line 3 (Third Best):** `#f97316` (Vibrant Orange - Cam rực rỡ). Nước đi khả thi cuối cùng.
*   *Mũi tên sẽ có dạng mờ nhẹ (Opacity 0.6 đến 0.8) để không che khuất các quân cờ bên dưới.*
