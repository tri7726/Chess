# 📊 Bảng Theo Dõi Cải Thiện Giao Diện (UI/UX Improvement Tracker)

Tài liệu này tổng hợp toàn bộ thông số thiết kế và lộ trình triển khai dựa trên 9 mẫu huy hiệu thực tế từ Chess.com bạn đã cung cấp.

---

## 🎨 1. BẢNG THÔNG SỐ THIẾT KẾ HUY HIỆU (BADGE DESIGN METRICS)

Dựa trên các hình ảnh thực tế bạn gửi, đây là bảng thông số chính xác để tái hiện giao diện chuẩn:

| Cấp độ nước đi | Biểu tượng | Màu sắc Huy hiệu (Badge) | Màu nền ô cờ (Square Tint) | Ý nghĩa chiến thuật |
| :--- | :---: | :--- | :--- | :--- |
| **Brilliant (Thiên tài)** | `!!` | Nền xanh cyan sáng (`bg-cyan-400 text-white`) | Xanh ngọc lam trong suốt (`rgba(6, 182, 212, 0.4)`) | Nước thí quân sáng suốt |
| **Great (Xuất sắc)** | `!` | Nền xanh lam đậm (`bg-blue-500 text-white`) | Xanh lam nhạt trong suốt (`rgba(59, 130, 246, 0.3)`) | Nước đi mạnh, duy trì thế trận |
| **Best (Tốt nhất)** | `★` | Nền xanh lá cây (`bg-emerald-600 text-white`) | Xanh lá olive trong suốt (`rgba(16, 185, 129, 0.35)`) | Nước đi tối ưu của máy tính |
| **Excellent (Rất tốt)** | `👍` | Nền xanh lá nhạt (`bg-green-500 text-white`) | Xanh lá nhạt trong suốt (`rgba(34, 197, 94, 0.3)`) | Nước đi tốt thứ hai hoặc ba |
| **Okay (Tàm tạm)** | `✓` | Nền xám xanh (`bg-zinc-500 text-white`) | Xám xanh nhạt trong suốt (`rgba(113, 113, 122, 0.3)`) | Nước đi bình thường |
| **Book / Theory (Lý thuyết)** | `📖` | Nền nâu gỗ (`bg-amber-800 text-white`) | Nâu nhạt trong suốt (`rgba(180, 83, 9, 0.3)`) | Nước đi đúng sách khai cuộc |
| **Inaccuracy (Không chuẩn)** | `?!` | Nền vàng (`bg-amber-500 text-white`) | Vàng nhạt trong suốt (`rgba(245, 158, 11, 0.3)`) | Nước đi làm giảm nhẹ lợi thế |
| **Mistake (Sai lầm)** | `?` | Nền cam (`bg-orange-500 text-white`) | Cam nhạt trong suốt (`rgba(249, 115, 22, 0.35)`) | Nước đi bỏ lỡ chiến thuật |
| **Blunder (Sai lầm nghiêm trọng)** | `??` | Nền đỏ rực (`bg-red-600 text-white`) | Đỏ nhạt trong suốt (`rgba(220, 38, 38, 0.4)`) | Nước đi làm xoay chuyển thế trận |

---

## 🚀 2. LỘ TRÌNH TRIỂN KHAI CODE (IMPLEMENTATION ROADMAP)

### 🟩 Bước 1: Chuẩn hóa CSS (`src/styles.css`)
*   Định nghĩa lại các lớp phủ nền (`highlight-brilliant` đến `highlight-theory`).
*   Thêm quy tắc CSS cho `.move-badge` (kích thước `25%` hoặc `28%` so với ô cờ, bo góc tròn `50%`, đổ bóng mượt mà, căn góc `top-1` và `right-1`).

### 🟩 Bước 2: Tích hợp logic vẽ huy hiệu lên bàn cờ (`ChessBoard.tsx`)
*   Bổ sung tham số `evalLabel` vào `ChessBoardProps`.
*   Cập nhật `useEffect` trong `ChessBoard.tsx` để tự động chèn phần tử HTML div `.move-badge` vào ô cờ đích mỗi khi nước đi thay đổi.

### 🟩 Bước 3: Đồng bộ trạng thái nước đi hiện tại (`game.$hash.tsx`)
*   Trong vòng lặp điều hướng ván cờ, lấy nhãn nước đi của nước đi đang chọn:
    ```typescript
    const currentEval = state.evals.find((e) => e.ply === currentPly);
    const evalLabel = currentEval?.label; // "brilliant", "blunder", ...
    ```
*   Truyền `evalLabel` vào component `<ChessBoard evalLabel={evalLabel} ... />`.

### 🟩 Bước 4: Viết lại component thống kê (`StatsTable.tsx`)
*   Cập nhật giao diện theo thiết kế mới: Ô hiển thị độ chính xác White/Black song song ở đầu trang, bảng chỉ số sử dụng đúng màu sắc và biểu tượng huy hiệu của từng cấp độ nước đi như đã định nghĩa ở trên.

---

## 💬 XÁC NHẬN TRIỂN KHAI (CONFIRMATION)
Hiện tại tôi đã tổng hợp đầy đủ thiết kế của cả **9 loại huy hiệu nước đi**. Bạn đã sẵn sàng để tôi áp dụng code nâng cấp này trực tiếp vào các file dự án chưa? Hãy cho tôi biết ý kiến của bạn!
