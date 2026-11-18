/**
 * Google Gemini API(무료 등급) 호출. SDK 없이 REST로 부르고, 정해진 JSON 형식으로만 답을 받습니다.
 * 키는 서버 환경변수(GEMINI_API_KEY)에만 둡니다. 키가 없으면 AI 기능은 503으로 꺼집니다.
 */
import { config } from "../../config.js";

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export class GeminiError extends Error {}

export async function geminiJson(parts: GeminiPart[], responseSchema: object, system?: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.aiModel)}:generateContent`;
  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2, maxOutputTokens: 1024 },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.geminiApiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new GeminiError(`gemini http ${response.status}`);
  const data = await response.json() as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text || (candidate?.finishReason && candidate.finishReason !== "STOP")) throw new GeminiError("gemini no result");
  try { return JSON.parse(text); } catch { throw new GeminiError("gemini invalid json"); }
}

/** 서버 메모리의 하루 사용량 제한(무료 등급 한도 보호). 서버가 다시 켜지면 초기화됩니다. */
const usage = new Map<string, { day: string; count: number }>();
export function consumeAiQuota(userId: string, perUser = 20, total = 200): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const get = (key: string) => { const e = usage.get(key); return e && e.day === day ? e : { day, count: 0 }; };
  const mine = get(userId); const all = get("__all__");
  if (mine.count >= perUser || all.count >= total) return false;
  mine.count += 1; all.count += 1;
  usage.set(userId, mine); usage.set("__all__", all);
  if (usage.size > 5000) for (const [key, value] of usage) if (value.day !== day) usage.delete(key);
  return true;
}
// [Claude | 2026-11-18] 엘리스 AI 챌린지 PoC — 유료 Claude API 대신 Gemini 무료 등급 사용
