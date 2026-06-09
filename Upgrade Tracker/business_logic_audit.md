# 🔍 Báo Cáo Kiểm Tra Logic Nghiệp Vụ (Business Logic Audit Report)

Tài liệu này đối chiếu chi tiết logic nghiệp vụ của **V-Max v3.0** với hệ thống **Game Review của Chess.com** hiện tại để tìm ra các điểm sai lệch thuật toán và đề xuất hướng tối ưu.

---

## 📊 1. PHÂN TÍCH THUẬT TOÁN PHÂN LOẠI NƯỚC ĐI (MOVE CLASSIFICATION COMPARISON)

### 🚨 Lỗi Logic Ngược Trong Phân Loại "Best" vs "Great"
Trong file `src/features/analysis/lib/move-labels.ts` từ dòng 68-72:
```typescript
} else if (isPlayedBest && delta <= 5) {
  // Great: played the exact best move (not a sacrifice), nearly no eval loss
  label = "great";
} else if (delta <= 5) {
  label = "best";
}
```
*   **Vấn đề:** 
    *   Nước cờ tốt nhất (`isPlayedBest === true`) luôn có độ giảm điểm (`delta`) bằng `0`. Do đó, điều kiện `isPlayedBest && delta <= 5` sẽ luôn đúng cho tất cả các nước cờ đi đúng dòng đề xuất của máy tính.
    *   Hậu quả là **mọi nước cờ đi đúng máy tính đề xuất đều bị gán nhãn là Great (`!`)**.
    *   Nhãn **Best (★)** chỉ được gán khi người chơi đi nước cờ *khác* đề xuất của máy tính nhưng độ giảm điểm vô cùng nhỏ (`delta <= 5`).
*   **So với Chess.com:** 
    *   Quy trình này bị đảo ngược hoàn toàn. Trên Chess.com, nước đi tốt nhất mặc định là **Best (★)**. 
    *   Nhãn **Great (`!`)** chỉ xuất hiện khi đó là nước cờ duy nhất giữ vững lợi thế hoặc chiến thắng (Unique Winning Move), hoặc nước đi cực kỳ khó tìm.

---

## 🕳️ 2. CÁC LỖ HỔNG LOGIC NGHIỆP VỤ KHÁC (GAPS IDENTIFIED)

### A. Thiếu nhãn "Missed Win" (Bỏ lỡ cơ hội thắng)
*   **Chess.com:** Khi người chơi đang ở thế thắng hoàn toàn (ví dụ: eval ≥ +3.0 hoặc đang có đòn chiếu bí) nhưng đi một nước cờ làm giảm lợi thế xuống hòa hoặc thua, Chess.com sẽ gán nhãn **Missed Win** (vòng tròn màu đỏ viền xám).
*   **V-Max hiện tại:** Đang gán nước đi này là **Blunder (??)** vì độ sụt giảm điểm (`delta`) lớn. Việc không tách biệt "Missed Win" khiến người chơi không học được lỗi chiến thuật quan trọng nhất.

### B. Thiếu nhãn "Forced" (Nước đi bắt buộc)
*   **Chess.com:** Các nước đi là lựa chọn hợp lệ duy nhất (ví dụ: bị chiếu và chỉ có 1 ô để chạy vua) sẽ được gán nhãn **Forced (Nước đi bắt buộc)**. Nước đi này sẽ không tính vào độ chính xác để tránh làm đẹp chỉ số một cách giả tạo.
*   **V-Max hiện tại:** Coi nước đi bắt buộc giống như nước đi thông thường, gán nhãn là "best" hoặc "great" và tính vào độ chính xác, dẫn đến điểm số chính xác của ván đấu bị đẩy lên cao không thực tế.

### C. Cơ chế tính độ chính xác tổng thể (CAPS2 vs Simple Average)
*   **Chess.com:** Sử dụng thuật toán **CAPS2 (Computer Accuracy Precision Score)** dựa trên mô hình **Expected Points (Điểm kỳ vọng)**. Các nước đi ở thế cờ phức tạp hoặc trung cuộc (critical moments) có trọng số ảnh hưởng lớn hơn các nước đi ở khai cuộc hoặc tàn cuộc đã định đoạt.
*   **V-Max hiện tại:** Tính trung bình cộng đơn giản (`Simple Average`) tổng điểm chính xác của các nước đi. Điều này khiến điểm số chính xác dễ bị sai lệch nếu ván đấu kéo dài ở giai đoạn tàn cuộc đơn giản.

### D. Tràn chữ trên thanh Đánh giá (`EvalBar.tsx` Text Overflow)
*   **Vấn đề:** Khi Stockfish phát hiện thế cờ ưu thế tuyệt đối (nhưng chưa báo chiếu bí ép buộc), nó có thể trả về centipawn cực cao (ví dụ: `cp = 30000`). Khi đó, thanh EvalBar sẽ tính toán giá trị hiển thị là `cp / 100 = 300` và cố hiển thị chuỗi `+300.0` trên màn hình. Do chiều rộng thanh dọc chỉ có 28px, chữ sẽ bị tràn khung.
*   **Giải pháp chuẩn:** Chess.com giới hạn tối đa hiển thị là `+99.0` hoặc `-99.0`, hoặc chuyển sang ký hiệu `#` khi thế trận đã hoàn toàn ngã ngũ.

### E. Lỗi tính độ chính xác cho Ván đấu siêu ngắn (Short Games Accuracy)
*   **Vấn đề:** Nếu đối thủ xin thua ngay ở nước thứ 2, White đi 1 nước, Black đi 0 nước. Lúc này, số nước đi của Black trong `aggregateAccuracy` là 0. Hàm sẽ trả về `0%` cho Black.
*   **Giải pháp chuẩn:** Khi một bên chưa đi hoặc đi quá ít (dưới 3 nước), Chess.com sẽ hiển thị trạng thái `N/A` hoặc không hiển thị thẻ độ chính xác để tránh gây hiểu lầm là họ chơi tệ.

### F. Báo động nhầm trạng thái Ức chế (Tilt False Positive do thiếu Clocks)
*   **Vấn đề:** Trong `detectTilt`, logic xác định người chơi đang đi vội (`isRush`) là:
    ```typescript
    const isRush = t === undefined || t < 4;
    ```
    Nếu PGN tải lên là file chuẩn (thường không đi kèm chú thích thời gian `[%clk]`), mọi phần tử trong mảng `timeSpents` đều là `undefined`. Khi đó, `isRush` luôn bằng `true` cho mọi nước đi!
    Hậu quả là **bất kỳ ván đấu nào không có dữ liệu thời gian mà người chơi phạm 3 sai lầm liên tiếp đều bị hệ thống cảnh báo oan là "Đang ức chế (Tilt detected)"**, kể cả khi họ suy nghĩ 10 phút mỗi nước.
*   **Giải pháp chuẩn:** Chỉ kích hoạt cảnh báo Tilt khi ván đấu có dữ liệu đồng hồ và phát hiện thực tế người chơi đi dưới 4 giây.


---

## ✅ 3. CÁC CẢI TIẾN ĐÃ THỰC HIỆN VÀ HOÀN THÀNH (IMPLEMENTED SOLUTIONS)

1.  **Sửa logic phân loại nhãn (Best vs Great):**
    *   Nước đi trùng đề xuất của Stockfish mặc định hiển thị nhãn **Best (★)**.
    *   Gán nhãn **Great (`!`)** khi nước đi của người chơi trùng với nước đi tốt nhất và có độ chênh lệch với nước đi tốt thứ hai $\ge 150$ cp (tức nước đi duy nhất duy trì thế trận / chiến thắng).
    *   Nước đi thay thế có độ giảm điểm nhỏ ($\le 15$ cp) được gán nhãn là **Excellent (👍)**.

2.  **Bổ sung logic nhận diện "Missed Win":**
    *   Hệ thống kiểm tra nếu trước nước đi, thế trận của người chơi thắng thế tuyệt đối ($\ge 200$ cp) nhưng sau nước đi, thế trận rơi xuống dưới $100$ cp (hòa hoặc thua), nhãn sẽ được chuyển từ Blunder/Mistake thông thường sang **Missed Win**.

3.  **Bổ sung logic "Forced Move":**
    *   Các nước đi bắt buộc (chỉ có 1 ô hợp lệ duy nhất) được gắn nhãn **Forced (F)** và **loại trừ hoàn toàn khỏi công thức tính độ chính xác tổng thể** để phản ánh đúng thực chất.

4.  **Nâng cấp Thuật toán tính độ chính xác tổng thể (Từ Simple Average sang CAPS2):**
    *   **Giải pháp:** Áp dụng mô hình tính điểm kỳ vọng tương tự CAPS2 của Chess.com. Các nước đi tại thế trận tranh chấp (dưới $\pm 150$ cp) nhận trọng số đầy đủ (`1.0`). Các thế trận càng lệch điểm (đã phân thắng bại, từ $150$ cp đến $1000$ cp) thì trọng số giảm dần tuyến tính xuống mức tối thiểu là `0.1` để tránh làm sai lệch độ chính xác tổng của ván cờ.

5.  **Khắc phục lỗi tràn chữ trên EvalBar:**
    *   **Giải pháp:** Trong `EvalBar.tsx`, điểm centipawn được giới hạn từ `-99.0` đến `+99.0` và tự động thu nhỏ cỡ chữ xuống `8px`/`scale(0.9)` khi độ dài hiển thị vượt quá 4 ký tự.

6.  **Xử lý độ chính xác ván đấu siêu ngắn (Dưới 3 nước đi):**
    *   **Giải pháp:** Nếu số nước đi hợp lệ của người chơi ít hơn 3 nước, hệ thống trả về `null` thay vì `0%` và giao diện `StatsTable.tsx` hiển thị nhãn `N/A`.

7.  **Khắc phục cảnh báo oan trạng thái Ức chế (Tilt False Positive):**
    *   **Giải pháp:** Tích hợp kiểm tra `hasTimeData` trong `detectTilt` tại `move-labels.ts`. Nếu PGN không chứa thông tin đồng hồ (`[%clk]`), cảnh báo Tilt sẽ được tắt hoàn toàn để tránh cảnh báo nhầm.
