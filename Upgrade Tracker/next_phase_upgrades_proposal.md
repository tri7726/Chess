# 🚀 Đề Xuất Chi Tiết Các Nâng Cấp Giai Đoạn Tiếp Theo (V-Max v3.0 Premium UX)

Tài liệu này đặc tả cơ chế kỹ thuật và giải pháp thiết kế cho 5 tính năng đột phá tiếp theo nhằm nâng tầm trải nghiệm của hệ thống ngang hàng với Chess.com Diamond membership.

---

## 🎵 1. HỆ THỐNG ÂM THANH DỰA TRÊN WEB AUDIO API (NO-ASSET DYNAMIC SOUND)

Thay vì tải các tệp tin `.mp3` nặng nề dễ bị lỗi mạng hoặc bản quyền, chúng ta sẽ tự tạo âm thanh thời gian thực bằng **Web Audio API** của trình duyệt. 

### Thuật Toán Tổng Hợp Tần Số (Audio Synthesis):
*   **Brilliant Move (Chime Lấp Lánh):** Tạo một chuỗi hợp âm rải nhanh (arpeggio) tăng dần sử dụng sóng Sine tần số cao (`1000Hz` ➡️ `1500Hz` ➡️ `2000Hz`) kết hợp với hiệu ứng tiếng vang (delay node) để tạo cảm giác kỳ ảo.
*   **Best Move (Click gỗ trầm ấm):** Tạo một xung nhiễu trắng cực ngắn kết hợp với bộ lọc thông thấp (low-pass filter) và biên độ giảm nhanh về 0 trong 0.05 giây để mô phỏng chính xác âm gỗ đập.
*   **Blunder (Tiếng còi cảnh báo):** Sử dụng sóng Sawtooth kết hợp tần số thấp (`180Hz` trộn `220Hz` tạo tiếng phách đập lệch pha khó chịu) giảm nhanh tần số xuống `120Hz` trong 0.3 giây để phát đi tín hiệu cảnh báo.

---

## 🏆 2. THUẬT TOÁN ƯỚC TÍNH ELO HIỆU SUẤT (PERFORMANCE ELO ESTIMATOR)

Hệ thống sẽ cung cấp cho người chơi một tấm thẻ chứng nhận Elo phong độ (Performance ELO Rating) sau mỗi ván đấu để tăng tính khích lệ.

### Công thức đề xuất:
$$\text{Performance Rating} = \text{Base ELO} + ((\text{Accuracy} - 72.5) \times 18) + (N_{\text{Brilliant}} \times 75) + (N_{\text{Great}} \times 40) - (N_{\text{Blunder}} \times 95)$$

*   **Base ELO:** Điểm Elo khai báo của người chơi (mặc định là 1200).
*   **Giới hạn (Clamp):** Kết quả cuối cùng sẽ được làm tròn và giới hạn trong khoảng từ `100 ELO` đến `3200 ELO`.
*   **Giao diện:** Thiết kế một thẻ "Performance Badge" sang trọng ở đầu màn hình review với màu sắc tương ứng:
    *   `< 1200`: Màu Đồng nhám.
    *   `1200 - 1600`: Màu Bạc bóng.
    *   `1600 - 2000`: Màu Vàng kim.
    *   `2000 - 2400`: Màu Xanh ngọc (Emerald).
    *   `> 2400`: Hiệu ứng đổi màu cực quang (Aurora Holographic).

---

## 🔄 3. CHẾ ĐỘ "THỬ THÁCH SỬA SAI" (KEY MOMENTS RETRY UI)

Giúp người chơi tương tác trực tiếp với sai lầm của mình thay vì chỉ xem phân tích thụ động.

### Luồng Hoạt Động (UX Flow):
1.  **Trích xuất lỗi:** Lọc ra tất cả các nước đi có nhãn `"blunder"`, `"mistake"`, hoặc `"missed"` từ danh sách nước đi đã phân tích.
2.  **Kích hoạt Retry:** Khi bấm **"Sửa lỗi sai (Retry)"**, bàn cờ sẽ quay lại thế trận trước khi nước đi lỗi diễn ra (`ply - 1`).
3.  **Khóa tương tác:** Ẩn nước cờ thực tế đã đi trên bàn cờ và danh sách nước đi bên phải. Hiển thị thông điệp huấn luyện viên: *"Trắng đã đi sai ở đây. Hãy tìm nước đi tốt nhất thế chỗ!"*.
4.  **Kiểm tra đáp án:** 
    *   Nếu người chơi đi đúng nước đi gợi ý của Stockfish (`bestMove`): Hiện pháo hoa chúc mừng, phát âm thanh Brilliant và bấm chuyển sang nước lỗi tiếp theo.
    *   Nếu đi sai: Rung bàn cờ nhẹ, báo âm thanh Blunder và cho phép thử lại.

---

## 🏹 4. CHẾ ĐỘ TỰ PHÂN TÍCH VỚI MULTI-PV = 3 (SELF-ANALYSIS ENGINE)

Tách biệt trải nghiệm giữa **Game Review** (Huấn luyện viên giảng giải) và **Self Analysis** (Nghiên cứu biến thể sâu).

### Các Nâng Cấp Kỹ Thuật:
*   **MultiPV = 3:** Kích hoạt Stockfish phân tích song song 3 biến thể tốt nhất thay vì chỉ 1 nước đi đơn lẻ.
*   **Bảng luồng biến thể (Live Lines):** Hiển thị 3 dòng biến kèm theo điểm số tương ứng để người dùng nhấp vào xem thử trước nước đi.
*   **Mũi tên vẽ trên bàn cờ (Threat Arrows):** Tự động vẽ 3 mũi tên màu sắc khác nhau trên bàn cờ tương ứng với 3 đề xuất:
    *   *Màu xanh lá:* Nhánh tốt nhất (PV 1).
    *   *Màu xanh lam:* Nhánh tốt thứ 2 (PV 2).
    *   *Màu cam nhạt:* Nhánh tốt thứ 3 (PV 3).

---

## 🎉 5. HIỆU ỨNG PHÁO HOA GIẤY (CANVAS CONFETTI PARTICLE SYSTEM)

Tạo cảm xúc bùng nổ khi kỳ thủ đi được nước cờ hay.

### Giải pháp kỹ thuật nhẹ:
*   Xây dựng một module vẽ hạt (particle) trực tiếp trên một lớp thẻ `<canvas>` ẩn đè lên trên bàn cờ Chessboard.
*   Khi người dùng click duyệt đến nước cờ có nhãn `brilliant` hoặc `great`, hệ thống sẽ kích hoạt bắn pháo hoa giấy tỏa ra từ ô cờ đích (destination square).
*   Mỗi hạt confetti có gia tốc rơi tự do, góc xoay ngẫu nhiên và màu sắc rực rỡ, tự động biến mất sau 1.5 giây để tránh làm giảm hiệu năng CPU.
