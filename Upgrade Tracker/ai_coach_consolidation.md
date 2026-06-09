# 🚀 PHƯƠNG ÁN CỦNG CỐ KIẾN TRÚC AI COACH (CONSOLIDATED AI ARCHITECTURE)

Dựa trên việc phân tích chi tiết mã nguồn từ hai dự án:
1. **`smartcity-ai-orchestrator`** (Java/Spring Boot - KeyPool Least-Used, Speculative Racing)
2. **`lex-love-loom`** (TypeScript/Edge Function - SSE Streaming, JSON extraction, Key Rotation)

Chúng ta tích hợp các giải pháp cao cấp này để nâng cấp kế hoạch xây dựng **AI Grandmaster Coach** cho dự án Chess lên mức chuyên nghiệp nhất.

---

## 🛠️ 1. CÁC TÍNH NĂNG CAO CẤP ĐƯỢC TÍCH HỢP

### A. Bộ điều phối xoay vòng Key có Cooldown (Health-Aware Key Pool)
*   *Thừa hưởng từ `GroqKeyPool.java`:* Không chỉ đơn thuần thử key tiếp theo khi lỗi, hệ thống sẽ quản lý trạng thái của từng API Key (`ACTIVE`, `COOLING` trong 60 giây khi gặp lỗi 429 Rate Limit, `EXHAUSTED` khi hết hạn mức ngày).
*   *Thuật toán chọn Key:* Ưu tiên lọc các key đang `ACTIVE`, sau đó chọn key có lượt sử dụng ít nhất (`Least-Used`) để tối ưu hóa giới hạn RPM (Request Per Minute) của Groq.

### B. Chế độ đua tài nguyên song song (Speculative Parallel Racing - Turbo Mode)
*   *Thừa hưởng từ `SpeculativeRacingService.java`:* Khi người dùng kích hoạt **"Chế độ Siêu Tốc (Turbo Mode)"**, hệ thống sẽ gửi câu hỏi song song tới cả Groq và Gemini.
*   *Cơ chế Abort:* Sử dụng `AbortController` của JavaScript. Provider nào phản hồi trước (ví dụ Groq về sau 0.4 giây) sẽ thắng và được hiển thị ngay lập tức, đồng thời gọi `abort()` để ngắt ngay kết nối của bên còn lại nhằm bảo vệ băng thông và hạn mức Token.

### C. Trích xuất JSON an toàn & Kiểm tra cấu trúc (Safe Extraction & Schema Validation)
*   *Thừa hưởng từ `ai-explain/index.ts`:* Tránh lỗi crash giao diện khi AI phản hồi kèm theo các ký tự markdown thừa. Sử dụng hàm Regex `extractFirstJson` để bóc tách khối JSON thô ra khỏi thẻ ` ```json ... ``` ` và chạy hàm xác thực cấu trúc dữ liệu trước khi kết xuất lên bàn cờ.

---

## 📐 2. BẢN VẼ PHÁC THẢO LỚP ĐIỀU PHỐI TIẾNG VIỆT (TÊN FILE: `ai-orchestrator.ts`)

Dưới đây là khung mã nguồn TypeScript sẽ được xây dựng để chạy trên máy chủ backend:

```typescript
import { playChessSound } from "@/shared/lib/sound";

export interface KeyEntry {
  key: string;
  status: "ACTIVE" | "COOLING" | "EXHAUSTED";
  useCount: number;
  coolingUntil: number | null;
}

// Danh sách pool key
const groqPool: KeyEntry[] = [
  { key: process.env.GROQ_API_KEY_1 || "", status: "ACTIVE", useCount: 0, coolingUntil: null },
  { key: process.env.GROQ_API_KEY_2 || "", status: "ACTIVE", useCount: 0, coolingUntil: null },
].filter(k => k.key !== "");

/**
 * Trích xuất JSON thô từ phản hồi của AI (Thừa hưởng từ lex-love-loom)
 */
function extractFirstJson(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {}
  
  const markdownMatch = trimmed.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (markdownMatch?.[1]) return markdownMatch[1];
  
  const jsonMatch = trimmed.match(/\{.*?\}/s);
  if (jsonMatch) return jsonMatch[0];
  
  return null;
}

/**
 * Lựa chọn Key theo cơ chế Least-Used & Health-Aware (Thừa hưởng từ smartcity)
 */
function getBestKey(): string | null {
  const now = Date.now();
  
  // Khôi phục các key hết thời gian cooling
  groqPool.forEach(k => {
    if (k.status === "COOLING" && k.coolingUntil && now > k.coolingUntil) {
      k.status = "ACTIVE";
      k.coolingUntil = null;
    }
  });

  const activeKeys = groqPool.filter(k => k.status === "ACTIVE");
  if (activeKeys.length === 0) return null;

  // Sắp xếp chọn key ít dùng nhất
  activeKeys.sort((a, b) => a.useCount - b.useCount);
  const best = activeKeys[0];
  best.useCount++;
  return best.key;
}
```

---

## 🚀 3. SƠ ĐỒ ĐUA SONG SONG (SPECULATIVE RACING FLOW)

```text
       [Yêu cầu phân tích thế cờ của người chơi]
                         │
        ┌────────────────┴────────────────┐
        ▼ (Yêu cầu 1)                     ▼ (Yêu cầu 2)
   Groq API (Llama 3)               Gemini API (1.5 Flash)
        │                                 │
        ▼                                 ▼
   [Xử lý nhanh: 0.4s]              [Xử lý chậm hơn: 1.2s]
        │                                 │
   (GROQ THẮNG!)                          │
        │                                 │
        ├─────────────────────────────────┘
        │
        ├──► 1. Hiển thị giải thích của Groq lên UI
        └──► 2. Gọi AbortController.abort() đối với Gemini (Huỷ bỏ kết nối)
```

---

## 📈 4. CẬP NHẬT KẾ HOẠCH BÀI BẢN HƠN TRÊN DASHBOARD
*   **Thêm bảng giám sát chất lượng (Metric Audit Dashboard):** Giống như lớp `/pool-stats` ở dự án Smart City, chúng ta sẽ thêm một biểu đồ tròn nhỏ tại Dashboard hiển thị tỉ lệ cuộc gọi thành công giữa Groq và Gemini, cùng thời gian phản hồi trung bình (Latency Ms) để chứng minh hiệu năng của ứng dụng cờ vua.
