/**
 * 토스페이먼츠 결제 승인·취소 REST API를 호출하는 서버 전용 클라이언트입니다.
 * 시크릿 키는 Basic 인증 자격증명으로만 사용하고 응답 원문을 payments 테이블에 그대로 남깁니다.
 * TEST 모드 키(test_sk_...)로 호출하면 실제 카드 승인 없이 결제 흐름을 그대로 재현합니다.
 */
import { config } from "./config.js";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

interface TossResult<T> { ok: boolean; status: number; body: T; }

const authHeader = () => `Basic ${Buffer.from(`${config.tossSecretKey}:`).toString("base64")}`;

async function tossRequest<T = Record<string, unknown>>(path: string, body: Record<string, unknown>): Promise<TossResult<T>> {
  const response = await fetch(`${TOSS_API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => ({})) as T;
  return { ok: response.ok, status: response.status, body: parsed };
}

export function confirmTossPayment(input: { paymentKey: string; orderId: string; amount: number }) {
  return tossRequest("/payments/confirm", input);
}

export function cancelTossPayment(paymentKey: string, cancelReason: string) {
  return tossRequest(`/payments/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason });
}
