/**
 * 토스페이먼츠 결제창(TEST 모드)이 successUrl로 돌아온 뒤 결제를 최종 승인하는 API입니다.
 * 프론트가 보낸 금액을 주문의 total_amount와 대조해 위·변조를 막고, 승인 응답 원문을 payments에 남깁니다.
 * 시크릿 키가 없으면 결제 승인 자체를 막아 결제 상태가 조용히 어긋나지 않게 합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { isTossConfigured } from "../../config.js";
import { getAdminSupabase } from "../../supabase.js";
import { confirmTossPayment } from "../../toss.js";
import { safeUserMessage } from "../../safe-message.js";
import { logError } from "../../error-log.js";

export const paymentsRouter = new Hono();

const confirmSchema = z.object({ orderId: z.string().uuid(), paymentKey: z.string().min(1).max(200), amount: z.number().int().min(0) }).strict();

paymentsRouter.post("/payments/toss/confirm", async (context) => {
  if (!context.var.currentUser) return context.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  if (!isTossConfigured()) return context.json(apiFailure("TOSS_UNCONFIGURED", "백엔드 TOSS_SECRET_KEY가 설정되지 않았습니다."), 503);
  const parsed = confirmSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "결제 승인 정보를 확인하세요.", parsed.error.flatten()), 400);
  const supabase = getAdminSupabase();
  const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", parsed.data.orderId).maybeSingle();
  if (orderError) return context.json(apiFailure("QUERY_FAILED", "주문을 조회하지 못했습니다."), 502);
  if (!order || order.user_id !== context.var.currentUser.id) return context.json(apiFailure("NOT_FOUND", "주문을 찾을 수 없습니다."), 404);
  if (order.payment_method !== "card") return context.json(apiFailure("INVALID_PAYMENT_METHOD", "카드 결제 주문이 아닙니다."), 400);
  if (order.payment_status === "paid") return context.json(apiSuccess({ order, alreadyPaid: true }));
  if (order.payment_status !== "pending_payment") return context.json(apiFailure("INVALID_PAYMENT_STATE", "결제를 승인할 수 없는 주문 상태입니다."), 409);
  if (order.total_amount !== parsed.data.amount) return context.json(apiFailure("AMOUNT_MISMATCH", "결제 금액이 주문 금액과 일치하지 않습니다."), 400);

  const result = await confirmTossPayment({ paymentKey: parsed.data.paymentKey, orderId: parsed.data.orderId, amount: parsed.data.amount });
  const approvedAt = (result.body as { approvedAt?: string }).approvedAt ?? null;
  await supabase.from("payments").insert({
    order_id: parsed.data.orderId,
    provider: "toss",
    toss_order_id: parsed.data.orderId,
    payment_key: parsed.data.paymentKey,
    amount: parsed.data.amount,
    status: result.ok ? "paid" : "failed",
    raw_response: result.body,
    approved_at: result.ok ? approvedAt : null,
  });
  if (!result.ok) {
    await supabase.from("orders").update({ payment_status: "payment_failed", updated_at: new Date().toISOString() }).eq("id", parsed.data.orderId);
    logError({ source: "backend", message: `confirmTossPayment: ${JSON.stringify(result.body)}`, path: context.req.path, method: context.req.method, statusCode: 502, userId: context.var.currentUser.id });
    const message = safeUserMessage((result.body as { message?: string }).message, "토스 결제 승인에 실패했습니다.");
    return context.json(apiFailure("TOSS_CONFIRM_FAILED", message), 502);
  }
  const { data: updated, error: updateError } = await supabase.from("orders").update({ payment_status: "paid", order_status: "confirmed", updated_at: new Date().toISOString() }).eq("id", parsed.data.orderId).select().single();
  if (updateError) return context.json(apiFailure("ORDER_UPDATE_FAILED", "결제는 승인됐지만 주문 상태 갱신에 실패했습니다. 관리자에게 문의하세요."), 500);
  return context.json(apiSuccess({ order: updated }));
});
