/** 판매자 사진을 AI가 편집 가능한 상품 초안으로 바꾸는 API. */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Hono } from "hono";
import { z } from "zod";
import { config } from "../../config.js";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

const inputSchema = z.object({
  imageBase64: z.string().min(4),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
}).strict();
const draftSchema = z.object({
  isProduct: z.boolean(), name: z.string(),
  category: z.enum(["베이커리", "음식", "카페", "마트", "꽃집"]),
  description: z.string(), estimatedOriginalPrice: z.number().int(),
  suggestedDiscountPercent: z.number().int(),
  confidence: z.enum(["high", "medium", "low"]),
});
export const productDraftRouter = new Hono();
productDraftRouter.post("/product-draft", requireRole("seller", "admin"), async (context) => {
  if (!config.anthropicApiKey) return context.json(apiFailure("AI_UNAVAILABLE", "AI 기능을 잠시 사용할 수 없어요."), 503);
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
  try {
    const { data: allowed, error } = await getAdminSupabase().rpc("timedeal_poc_consume_ai_quota", { p_actor_id: context.var.currentUser!.id });
    if (error || typeof allowed !== "boolean") return context.json(apiFailure("AI_UNAVAILABLE", "AI 기능을 잠시 사용할 수 없어요."), 503);
    if (!allowed) return context.json(apiFailure("AI_LIMIT", "오늘의 AI 이용 한도에 도달했어요."), 429);
  } catch {
    return context.json(apiFailure("AI_UNAVAILABLE", "AI 기능을 잠시 사용할 수 없어요."), 503);
  }
  // [Codex | 2026-11-06] AI 요청 — DB 원자적 상한을 적용하고 제한 확인 실패 시 차단
  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey, timeout: 30_000, maxRetries: 0 });
    const response = await client.messages.parse({
      model: config.aiModel, max_tokens: 1000,
      output_config: { format: zodOutputFormat(draftSchema) },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
        { type: "text", text: "동네 가게의 판매 상품 사진입니다. 한국어 상품명, 간결한 설명과 카테고리, 추정 정가(원), 권장 할인율(20~50)을 초안으로 만드세요. 보이지 않는 수량·성분·품질을 단정하지 마세요. 판매 상품이 아니면 isProduct=false로 응답하세요. 가격을 알 수 없으면 0으로 응답하세요." },
      ] }],
    });
    const draft = response.parsed_output;
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !draft || draft.name.length > 100 || draft.description.length > 500 || draft.estimatedOriginalPrice < 0 || draft.estimatedOriginalPrice > 100_000_000 || draft.suggestedDiscountPercent < 20 || draft.suggestedDiscountPercent > 50) {
      return context.json(apiFailure("AI_FAILED", "AI 초안을 만들지 못했어요. 다시 시도해 주세요."), 502);
    }
    return context.json(apiSuccess({ draft }));
  } catch {
    return context.json(apiFailure("AI_FAILED", "AI 기능을 잠시 사용할 수 없어요."), 502);
  }
});
// [Codex | 2026-11-06] productDraftRouter — 판매자 인증, 크기·형식·호출 제한과 AI 초안 검증
