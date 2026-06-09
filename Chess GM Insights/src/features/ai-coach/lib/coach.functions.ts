import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface CoachResponse {
  explanation: string;
  concept: string;
  provider: "GROQ" | "GEMINI" | "MOCK";
  latencyMs: number;
  tokensUsed?: number;
}

// Simple health-aware key pool for Groq keys from process.env
interface KeyEntry {
  key: string;
  status: "ACTIVE" | "COOLING";
  coolingUntil: number | null;
}

const groqKeys: KeyEntry[] = (process.env.GROQ_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k !== "")
  .map((k) => ({ key: k, status: "ACTIVE", coolingUntil: null }));

function getActiveGroqKey(): string | null {
  const now = Date.now();
  for (const entry of groqKeys) {
    if (entry.status === "COOLING" && entry.coolingUntil && now > entry.coolingUntil) {
      entry.status = "ACTIVE";
      entry.coolingUntil = null;
    }
    if (entry.status === "ACTIVE") {
      return entry.key;
    }
  }
  return null;
}

function markGroqKeyCooling(key: string) {
  const entry = groqKeys.find((k) => k.key === key);
  if (entry) {
    entry.status = "COOLING";
    entry.coolingUntil = Date.now() + 60 * 1000; // 60s cooldown
  }
}

// Safe JSON parser/extractor
function extractFirstJson(raw: string): { explanation: string; concept: string } | null {
  try {
    const trimmed = raw.trim();
    // Try parsing direct JSON
    return JSON.parse(trimmed);
  } catch {
    try {
      // Try extracting from ```json ... ``` codeblocks
      const match = raw.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (match?.[1]) return JSON.parse(match[1]);

      // Robust extraction: find outer-most curly braces to handle nested braces/internal braces
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      }
    } catch {}
  }
  return null;
}

// Smart local fallback if no API keys are present
function getLocalMockResponse(
  label: string,
  delta: number,
  userMove: string,
  bestMove: string
): { explanation: string; concept: string } {
  switch (label) {
    case "brilliant":
      return {
        explanation: `Tuyệt vời! Nước đi ${userMove} là một đòn hi sinh quân cờ táo bạo nhưng cực kỳ chính xác, mở toang các điểm yếu chí mạng trong hàng phòng ngự đối thủ.`,
        concept: "Thí quân chiến thuật (Tactical Sacrifice)"
      };
    case "great":
      return {
        explanation: `Nước cờ ${userMove} vô cùng sắc bén và là nước đi duy nhất giúp bạn duy trì hoặc gia tăng lợi thế trong thế trận phức tạp này.`,
        concept: "Nước đi duy nhất (Unique Move)"
      };
    case "best":
      return {
        explanation: `Nước cờ ${userMove} hoàn toàn chính xác theo đúng khuyến nghị hàng đầu của Stockfish, giúp củng cố thế trận vững chắc.`,
        concept: "Kiểm soát không gian (Positional Control)"
      };
    case "excellent":
      return {
        explanation: `Một nước đi rất tốt! Dù không phải là lựa chọn tối ưu tuyệt đối nhưng ${userMove} vẫn duy trì áp lực lên đối phương.`,
        concept: "Phát triển quân cờ (Piece Development)"
      };
    case "good":
      return {
        explanation: `Nước đi ${userMove} ổn định, giúp giữ vững cấu trúc trận đấu nhưng chưa tạo ra được nhiều đe dọa đột phá.`,
        concept: "Củng cố phòng thủ (Fortification)"
      };
    case "inaccuracy":
      return {
        explanation: `Nước đi ${userMove} hơi thiếu chính xác. Đáng lẽ bạn nên đi ${bestMove} để tạo ra áp lực mạnh mẽ hơn lên quân vua đối thủ.`,
        concept: "Bỏ lỡ cơ hội áp đảo (Missed Opportunity)"
      };
    case "mistake":
      return {
        explanation: `Nước cờ ${userMove} là một sai lầm nhỏ. Nó tạo điều kiện cho đối thủ phản công. Đi nước ${bestMove} sẽ an toàn hơn nhiều.`,
        concept: "Lỗi cấu trúc Tốt/Vị trí (Positional Mistake)"
      };
    case "blunder":
      return {
        explanation: `Ui da! Nước đi ${userMove} là một sai lầm nghiêm trọng làm suy giảm mạnh thế trận. Đối phương có thể khai thác sơ hở này ngay lập tức.`,
        concept: "Sơ hở chiến thuật (Tactical Blunder)"
      };
    case "missed":
      return {
        explanation: `Bạn đã bỏ lỡ một cơ hội chiến thắng ngon ăn ở đây! Đáng lẽ đi ${bestMove} sẽ giúp bạn chiếu bí hoặc giành lợi thế vật chất cực lớn.`,
        concept: "Bỏ lỡ đòn thắng (Missed Win)"
      };
    case "forced":
      return {
        explanation: `Nước đi ${userMove} là lựa chọn hợp lệ duy nhất của thế cờ (ví dụ: bị chiếu bắt buộc phải chạy hoặc chỉ còn một ô duy nhất).`,
        concept: "Nước đi bắt buộc (Forced Move)"
      };
    case "theory":
      return {
        explanation: `Nước đi ${userMove} nằm trong sách lý thuyết khai cuộc chuẩn mực (Book Move), giúp bạn giữ vững cấu trúc và phát triển thế trận từ sớm.`,
        concept: "Lý thuyết Khai cuộc (Opening Theory)"
      };
    default:
      return {
        explanation: `Nước đi ${userMove} duy trì sự ổn định của thế cờ hiện tại.`,
        concept: "Nước đi thông thường (Standard Move)"
      };
  }
}

export const explainMove = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        fen: z.string(),
        userMove: z.string(),
        bestMove: z.string(),
        label: z.string(),
        delta: z.number(),
        context: z.string().optional(),
        turboMode: z.boolean().default(false),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { fen, userMove, bestMove, label, delta, context, turboMode } = data;

    const groqKey = getActiveGroqKey();
    const geminiKey = process.env.GEMINI_API_KEY || "";

    const systemPrompt = `Bạn là một Đại kiện tướng cờ vua quốc tế (Grandmaster) đồng thời là một huấn luyện viên cờ vua nhiệt huyết.
Nhiệm vụ của bạn là giải thích chiến thuật cờ vua bằng tiếng Việt một cách dễ hiểu, ngắn gọn (tối đa 3-4 câu).

=== BẮT ĐẦU DỮ LIỆU THẾ CỜ (USER DATA) ===
Thế trận (FEN): ${fen}
Nước cờ đã đi: ${userMove} (Nhãn: ${label}, Độ lệch điểm: ${delta} cp)
Nước cờ tốt nhất của Stockfish đề xuất: ${bestMove}
=== KẾT THÚC DỮ LIỆU THẾ CỜ (USER DATA) ===
${context ? `\n=== DỮ LIỆU CHIẾN THUẬT ĐÃ PHÂN TÍCH ===\n${context}\n=========================================\n` : ""}
LƯU Ý HỆ THỐNG:
1. Tuyệt đối KHÔNG tự ý tính cờ hay ảo tưởng vị trí các quân cờ trên bàn. LLM rất dở tính cờ vua, hãy tin tưởng 100% vào Dữ liệu Chiến thuật được cung cấp.
2. Dùng dữ liệu trên để hành văn giải thích chiến lược mạch lạc cho người dùng.
3. Phản hồi bằng khối JSON hợp lệ duy nhất như sau, tuyệt đối không thêm bớt từ ngữ ngoài khối:
{
  "explanation": "Giải thích chi tiết tại sao nước đi của người chơi lại yếu hơn/tốt hơn và ý đồ chiến thuật của nước đi tốt nhất dựa trên dữ liệu đã phân tích...",
  "concept": "Tên đòn chiến thuật áp dụng bằng tiếng Việt (ví dụ: Ghim quân, Xiên quân, Tấn công mở, Đe dọa chiếu bí...)"
}`;

    // Fallback if no keys are configured
    if (!groqKey && !geminiKey) {
      const start = Date.now();
      const mockResult = getLocalMockResponse(label, delta, userMove, bestMove);
      return {
        ...mockResult,
        provider: "MOCK" as const,
        latencyMs: Date.now() - start,
        tokensUsed: 0,
      };
    }

    const start = Date.now();

    // Groq fetch helper
    const callGroq = async (apiKey: string, signal?: AbortSignal) => {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.3,
          max_tokens: 300,
        }),
        signal,
      });

      if (response.status === 429) {
        markGroqKeyCooling(apiKey);
        throw new Error("GROQ_RATE_LIMIT");
      }

      if (!response.ok) {
        throw new Error("GROQ_ERROR");
      }

      const resData = await response.json();
      const text = resData.choices?.[0]?.message?.content || "";
      const parsed = extractFirstJson(text);
      if (!parsed) throw new Error("INVALID_JSON");

      return {
        explanation: parsed.explanation,
        concept: parsed.concept,
        provider: "GROQ" as const,
        tokensUsed: resData.usage?.total_tokens || 0,
      };
    };

    // Gemini fetch helper
    const callGemini = async (apiKey: string, signal?: AbortSignal) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          }),
          signal,
        }
      );

      if (!response.ok) {
        throw new Error("GEMINI_ERROR");
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = extractFirstJson(text);
      if (!parsed) throw new Error("INVALID_JSON");

      return {
        explanation: parsed.explanation,
        concept: parsed.concept,
        provider: "GEMINI" as const,
        tokensUsed: 0, // Gemini API doesn't return tokens in a simple field without extra call
      };
    };

    // Speculative Parallel Racing (Turbo Mode)
    if (turboMode && groqKey && geminiKey) {
      const controller = new AbortController();
      try {
        const result = await Promise.any([
          callGroq(groqKey, controller.signal),
          callGemini(geminiKey, controller.signal),
        ]);
        controller.abort(); // Cancel the slower request
        return {
          ...result,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        // Fallback to whichever is alive if Promise.any fails
        controller.abort();
      }
    }

    // Standard sequential fallback (Groq -> Gemini -> Mock)
    if (groqKey) {
      try {
        const result = await callGroq(groqKey);
        return {
          ...result,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        // Fallback to Gemini
        if (geminiKey) {
          try {
            const result = await callGemini(geminiKey);
            return {
              ...result,
              latencyMs: Date.now() - start,
            };
          } catch {}
        }
      }
    } else if (geminiKey) {
      try {
        const result = await callGemini(geminiKey);
        return {
          ...result,
          latencyMs: Date.now() - start,
        };
      } catch {}
    }

    // Default mock fallback if everything else failed
    const mockResult = getLocalMockResponse(label, delta, userMove, bestMove);
    return {
      ...mockResult,
      provider: "MOCK" as const,
      latencyMs: Date.now() - start,
      tokensUsed: 0,
    };
  });
