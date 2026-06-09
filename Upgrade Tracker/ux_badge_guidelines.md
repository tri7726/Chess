# 📋 Quy Tắc Sử Dụng Huy Hiệu Đánh Giá (UX/UI Badge Guidelines)

Tài liệu này hướng dẫn cách thức, thời điểm và các chế độ chơi áp dụng hệ thống huy hiệu đánh giá nước đi (Move Badges) để tối ưu hóa trải nghiệm người dùng, giúp giao diện trực quan và tạo động lực học tập tốt nhất.

---

## 🕹️ 1. DÙNG TRONG CHẾ ĐỘ NÀO? (WHICH MODES?)

Hệ thống huy hiệu sẽ hoạt động khác nhau tùy thuộc vào chế độ màn hình mà người dùng đang thao tác:

### A. Chế độ Xem lại ván đấu (Game Review Mode) — *Chế độ chính*
*   **Cách dùng:** Bàn cờ hiển thị nước đi thực tế đã chơi trong ván đấu.
*   **Quy tắc:** Chỉ hiển thị **duy nhất 1 huy hiệu** trên bàn cờ tại ô cờ đích của nước đi đang được chọn (Active Ply).
*   **Ví dụ:** Người dùng đang xem nước thứ 15 (Trắng đi `Bxf7+` - nước chiếu ăn quân là Blunder). Trên bàn cờ, ô `f7` sẽ được tô nền đỏ nhạt và xuất hiện huy hiệu đỏ `??` ở góc phải ô `f7`. Khi chuyển sang nước 16, huy hiệu ở `f7` biến mất, xuất hiện huy hiệu mới của nước 16.

### B. Chế độ Tự phân tích (Self-Analysis Mode)
*   **Cách dùng:** Người chơi tự do đi thử các nước đi giả định (Alternative lines) ngoài thực tế ván đấu.
*   **Quy tắc:** 
    *   Tạm thời **ẩn hoàn toàn** huy hiệu của ván đấu thực tế khi người chơi bắt đầu đi thử các nước cờ giả định (vì lúc này bàn cờ không còn khớp với lịch sử ván đấu gốc).
    *   Thay vào đó, hiển thị các mũi tên hướng đi của máy tính (Multi-PV).
    *   Khi người dùng nhấn nút "Quay lại ván đấu" (Back to Game), hiển thị lại huy hiệu của nước đi thực tế tại Ply hiện tại.

### C. Chế độ "Thử thách sửa sai" (Blunder/Mistake Retry)
*   **Cách dùng:** Người chơi bấm nút "Thử lại nước lỗi" để tìm nước đi tốt hơn.
*   **Quy tắc:**
    *   **Trước khi đi:** Ẩn huy hiệu lỗi gốc (ví dụ: Blunder `??`) để người chơi không bị phân tâm.
    *   **Trong khi đi:** Cho phép người chơi tự do di chuyển.
    *   **Sau khi đi:**
        *   Nếu đi đúng nước cờ tốt nhất: Tô xanh lá ô cờ, bắn pháo hoa giấy (confetti) nhẹ và hiển thị huy hiệu Best `★` hoặc Brilliant `!!` để thưởng dopamine cho người chơi.
        *   Nếu đi sai: Hiển thị chữ `X` đỏ hoặc huy hiệu Mistake `?` màu cam để báo hiệu cần thử lại.

---

## ⏰ 2. DÙNG VÀO LÚC NÀO? (WHEN TO SHOW THEM?)

Huy hiệu cờ vua là phần thưởng kích thích thị giác (Dopamine Trigger), do đó thời điểm xuất hiện rất quan trọng:

1.  **Khi duyệt nước đi (Linear Navigation):**
    *   Khi người dùng nhấn nút Next `▶`, Prev `◀`, bấm phím mũi tên, hoặc click vào một nước đi trong danh sách.
    *   Ngay khi quân cờ di chuyển đến ô đích, huy hiệu sẽ xuất hiện với hiệu ứng zoom nhẹ (scale-in animation trong 150ms) để thu hút sự chú ý.
2.  **Khi rê chuột trên đồ thị (Hover on Eval Chart):**
    *   Khi người dùng hover chuột qua các điểm trên đồ thị Eval, nếu điểm đó tương ứng với nước Brilliant hoặc Blunder, hiển thị tooltip có icon huy hiệu nhỏ để người dùng biết đó là điểm gãy thế trận.
3.  **Khi hoàn thành phân tích (Analysis Completion):**
    *   Trong danh sách nước đi (Moves List), các huy hiệu nhỏ (Mini-badge) sẽ xuất hiện bên cạnh ký hiệu cờ (ví dụ: `15. Bxf7# ??`) ngay khi Stockfish phân tích xong nước đi đó (phân tích lũy tiến).

---

## 📍 3. DÙNG Ở ĐÂU TRÊN MÀN HÌNH? (WHERE TO RENDER?)

Huy hiệu xuất hiện ở 4 khu vực chính trên giao diện để đảm bảo tính đồng bộ:

```
┌────────────────────────────────────────────────────────┐
│ [1. TRÊN BÀN CỜ]                                       │
│ ┌────────────────────────┐                             │
│ │ 🨅  🨓  🨔  🨕  🨖  🨔  🨓  🨅 │                             │
│ │ 🨶  🨶  🨶  🨶  🨶  🨶  🨶  🨶 │                             │
│ │      [ Ô cờ đích ]     │                             │
│ │      ┌───────────┐     │                             │
│ │      │ 🦄    [!!]│     │ <─ Huy hiệu tuyệt đối góc    │
│ │      └───────────┘     │    phải, đè trên quân cờ    │
│ └────────────────────────┘                             │
├────────────────────────────────────────────────────────┤
│ [2. DANH SÁCH NƯỚC ĐI]                                 │
│ 12. Nf3 [★]   d5 [✓]                                   │
│ 13. e4 [📖]   dxe4 [👍]                                 │
│ 14. Ng5 [??]  e3 [?!]     <─ Huy hiệu nhỏ cạnh text    │
├────────────────────────────────────────────────────────┤
│ [3. BẢNG THỐNG KÊ ACCURACIES]                          │
│ Brilliant   [ 1 ] ── [!!] ── [ 0 ]                     │
│ Blunder     [ 0 ] ── [??] ── [ 2 ] <─ Huy hiệu ở giữa  │
└────────────────────────────────────────────────────────┘
```

1.  **Trực tiếp trên ô cờ (Board Overlay):**
    *   Vị trí: Góc trên bên phải của ô cờ đích.
    *   Z-Index: Phải lớn hơn Z-Index của quân cờ (`.piece`) để không bị quân cờ che khuất, nhưng nhỏ hơn các mũi tên vẽ tự do (`cb-arrow`) để mũi tên vẫn hiển thị rõ ràng.
2.  **Trong danh sách nước đi (Moves List):**
    *   Hiển thị huy hiệu dạng phẳng nhỏ bên cạnh ký hiệu SAN của nước đi (ví dụ: `Nxf7 [!!]`).
3.  **Trong bảng so sánh (Stats Table):**
    *   Hiển thị làm trục trung tâm giữa chỉ số của White và Black để người dùng dễ dàng đối chiếu số lượng nước đi của 2 bên.
4.  **Bảng tóm tắt khoảnh khắc (Key Moments):**
    *   Hiển thị danh sách các nước đi đặc biệt (Brilliant, Blunder, Missed Win) kèm theo huy hiệu tương ứng để người dùng click nhanh và sửa sai.
