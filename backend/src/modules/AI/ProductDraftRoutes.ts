/** 판매자 사진을 AI가 편집 가능한 상품 초안으로 바꾸는 API. 등록은 하지 않고 초안만 돌려줍니다. */
import { Hono } from "hono";
import { z } from "zod";
import { config } from "../../config.js";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireRole } from "../../middleware/auth.js";
import { consumeAiQuota, geminiJson } from "./gemini.js";

const CATEGORIES = ["베이커리", "음식", "카페", "마트", "꽃집"] as const;
const inputSchema = z.object({
  imageBase64: z.string().min(4),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
}).strict();
const draftSchema = z.object({
  isProduct: z.boolean(), name: z.string().max(100),
  category: z.enum(CATEGORIES),
  description: z.string().max(500), estimatedOriginalPrice: z.number().int().min(0).max(100_000_000),
  suggestedDiscountPercent: z.number().int().min(20).max(50),
  confidence: z.enum(["high", "medium", "low"]),
});
const responseSchema = {
  type: "OBJECT",
  properties: {
    isProduct: { type: "BOOLEAN" },
    name: { type: "STRING" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    description: { type: "STRING" },
    estimatedOriginalPrice: { type: "INTEGER" },
    suggestedDiscountPercent: { type: "INTEGER" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
  },
  required: ["isProduct", "name", "category", "description", "estimatedOriginalPrice", "suggestedDiscountPercent", "confidence"],
};
const PROMPT = "동네 가게의 판매 상품 사진입니다. 한국어 상품명(30자 이내), 간결한 설명(2문장 이내)과 카테고리, 추정 정가(원), 권장 할인율(20~50)을 초안으로 만드세요. 보이지 않는 수량·성분·품질을 단정하지 마세요. 판매 상품이 아니면 isProduct=false로 응답하세요. 가격을 알 수 없으면 0으로 응답하세요.";

export const productDraftRouter = new Hono();
productDraftRouter.post("/product-draft", requireRole("seller", "admin"), async (context) => {
  if (!config.geminiApiKey) return context.json(apiFailure("AI_UNAVAILABLE", "AI 기능을 잠시 사용할 수 없어요."), 503);
  const parsed = inputSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "사진을 확인해 주세요."), 400);
  const { imageBase64, mediaType } = parsed.data;
  if (imageBase64.length > Math.ceil(config.maxImageBytes / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageBase64)) {
    return context.json(apiFailure("INVALID_IMAGE", "사진 크기 또는 형식을 확인해 주세요."), 400);
  }
  const bytes = Buffer.from(imageBase64, "base64");
  const matches = mediaType === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : mediaType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!matches || bytes.length > config.maxImageBytes) return context.json(apiFailure("INVALID_IMAGE", "사진 크기 또는 형식을 확인해 주세요."), 400);
  if (!consumeAiQuota(context.var.currentUser!.id)) return context.json(apiFailure("AI_LIMIT", "오늘의 AI 이용 한도에 도달했어요."), 429);
  try {
    const raw = await geminiJson([{ inline_data: { mime_type: mediaType, data: imageBase64 } }, { text: PROMPT }], responseSchema);
    const draft = draftSchema.safeParse(raw);
    if (!draft.success) return context.json(apiFailure("AI_FAILED", "AI 초안을 만들지 못했어요. 다시 시도해 주세요."), 502);
    return context.json(apiSuccess({ draft: draft.data }));
  } catch {
    return context.json(apiFailure("AI_FAILED", "AI 기능을 잠시 사용할 수 없어요."), 502);
  }
});
// [Claude | 2026-11-18] 사진 초안 API — Gemini 무료 등급, 판매자 권한·크기·형식·하루 사용량 검사 후 형식 검증
