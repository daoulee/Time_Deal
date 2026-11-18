/**
 * Google Gemini API(무료 등급) 호출. SDK 없이 REST로 부르고, 정해진 JSON 형식으로만 답을 받습니다.
 * 키는 서버 환경변수(GEMINI_API_KEY)에만 둡니다. 키가 없으면 AI 기능은 503으로 꺼집니다.
 */
import { config } from "../../config.js";

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export class GeminiError extends Error {}

// 무료 등급에서 하루 요청 수가 넉넉한 Flash Lite부터 시도하고, 없는 모델(404)이면 다음 후보로 넘어갑니다.
// AI_MODEL 환경변수를 넣으면 그 모델을 맨 앞에 둡니다.
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
let workingModel: string | null = null;
const modelCandidates = () => [...new Set([workingModel, config.aiModel, ...FALLBACK_MODELS].filter((m): m is string => Boolean(m)))];

export async function geminiJson(parts: GeminiPart[], responseSchema: object, system?: string): Promise<unknown> {
  const body = JSON.stringify({
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2, maxOutputTokens: 1024 },
  });
  for (const model of modelCandidates()) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.geminiApiKey },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      // 원인 확인용 로그(키는 헤더로만 보내므로 응답 본문에 키가 들어가지 않음)
      const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
      console.warn(`[gemini] model=${model} status=${response.status} ${detail}`);
      if (response.status === 404) continue;
      throw new GeminiError(`gemini http ${response.status}`);
    }
    workingModel = model;
    const data = await response.json() as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text || (candidate?.finishReason && candidate.finishReason !== "STOP")) {
      console.warn(`[gemini] model=${model} no result finishReason=${candidate?.finishReason ?? "none"}`);
      throw new GeminiError("gemini no result");
    }
    try { return JSON.parse(text); } catch { throw new GeminiError("gemini invalid json"); }
  }
  throw new GeminiError("gemini no available model");
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
