/**
 * 모든 API 요청에 요청 ID·보안 헤더·본문 크기 제한·IP 기반 속도 제한을 적용합니다.
 * 단일 Render 인스턴스용 메모리 저장소이며 다중 인스턴스 운영 시 Redis 같은 공유 저장소로 교체합니다.
 */
import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { apiFailure } from "../http.js";
import { config } from "../config.js";

interface RateEntry { count: number; resetAt: number }
const buckets = new Map<string, RateEntry>();

const clientKey = (header: string | undefined): string => header?.split(",")[0]?.trim() || "unknown";

export const requestSecurity: MiddlewareHandler = async (context, next) => {
  const requestId = context.req.header("x-request-id")?.slice(0, 100) || randomUUID();
  context.header("x-request-id", requestId);
  context.header("x-content-type-options", "nosniff");
  context.header("x-frame-options", "DENY");
  context.header("referrer-policy", "strict-origin-when-cross-origin");
  context.header("permissions-policy", "camera=(), microphone=(), geolocation=(self)");
  context.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (context.req.url.startsWith("https://")) context.header("strict-transport-security", "max-age=31536000; includeSubDomains");

  const contentLength = Number(context.req.header("content-length") ?? "0");
  // AI 사진 초안 API만 사진(base64) 크기만큼 본문을 더 허용합니다.
  const isAiPhoto = context.req.path === "/api/mobile/merchant/ai/product-draft" && context.req.method === "POST";
  const maxBody = isAiPhoto ? Math.ceil(config.maxImageBytes / 3) * 4 + 4096 : 1_048_576;
  if (contentLength > maxBody) return context.json(apiFailure("PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다."), 413);

  const now = Date.now();
  const isSensitive = /\/api\/(auth|inquiries|community|orders)/.test(context.req.path) && context.req.method !== "GET";
  const limit = isSensitive ? 30 : 300;
  const windowMs = 60_000;
  const key = `${clientKey(context.req.header("x-forwarded-for"))}:${isSensitive ? "write" : "read"}`;
  const current = buckets.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  buckets.set(key, entry);
  context.header("x-ratelimit-limit", String(limit));
  context.header("x-ratelimit-remaining", String(Math.max(0, limit - entry.count)));
  if (entry.count > limit) {
    context.header("retry-after", String(Math.ceil((entry.resetAt - now) / 1000)));
    return context.json(apiFailure("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."), 429);
  }

  if (buckets.size > 10_000) for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  await next();
};
