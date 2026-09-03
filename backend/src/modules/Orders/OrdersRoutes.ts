/**
 * 멀티셀러 주문·지역 픽업·판매자별 fulfillment API를 제공합니다.
 * 현장 결제와 결제 없는 예약만 허용하고, 판매자 응답에는 자기 상품과 최소 픽업 정보만 포함합니다.
 */
import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config, isSupabaseConfigured } from "../../config.js";
import { requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
import { cancelTossPayment } from "../../toss.js";
import { safeUserMessage } from "../../safe-message.js";
import { logError } from "../../error-log.js";

export const ordersRouter = new Hono();
const sampleLocations = [{ id: "11111111-1111-4111-8111-111111111111", name: "정왕동 주민센터 앞", address: "경기도 시흥시 정왕대로 233", description: "개발 샘플 장소", isActive: true }];
const itemSchema = z.object({ productId: z.string().min(1).max(120), dealId: z.string().min(1).max(120).optional(), quantity: z.number().int().min(1).max(20) }).strict();
const createSchema = z.object({ pickupLocationId: z.string().uuid(), pickupSlotId: z.string().uuid(), paymentMethod: z.enum(["on_site", "reservation_only", "card"]), idempotencyKey: z.string().min(8).max(120), deliveryAddress: z.string().trim().min(1).max(300).optional(), items: z.array(itemSchema).min(1).max(50) }).strict().refine((value) => new Set(value.items.map((item) => item.productId)).size === value.items.length, "같은 상품을 중복해서 담을 수 없습니다.");
const paymentStatusOf = (method: string) => method === "on_site" ? "pay_on_pickup" : method === "card" ? "pending_payment" : "not_applicable";
const groupStatusSchema = z.object({ status: z.enum(["pending", "confirmed", "ready", "completed"]), pickupStatus: z.enum(["pending", "ready", "collected", "no_show"]).optional() }).strict();
interface OrderRow extends Record<string, unknown> { id: string; user_id: string; payment_status: string; payment_method: string }
const readOnly = (context: Context) => context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 연결 전에는 주문을 저장할 수 없습니다."), 503);
const serializeOrder = (order: Record<string, unknown>) => ({ ...order, orderNumber: order.order_number, userId: order.user_id, pickupLocationId: order.pickup_location_id, pickupSlotId: order.pickup_slot_id, totalAmount: order.total_amount, orderStatus: order.order_status, paymentMethod: order.payment_method, paymentStatus: order.payment_status, pickupStatus: order.pickup_status, deliveryAddress: order.delivery_address, createdAt: order.created_at });
const getOrder = async (id: string) => getAdminSupabase().from("orders").select("*,order_items(*),fulfillment_groups(*)").eq("id", id).maybeSingle();
const transitions: Record<string, string[]> = { pending: ["confirmed"], confirmed: ["ready"], ready: ["completed"], completed: [], cancelled: [] };

ordersRouter.get("/pickup-locations", async (context) => {
  if (!isSupabaseConfigured()) return config.enableSampleData ? context.json(apiSuccess({ locations: sampleLocations, source: "sample", notice: "개발 전용 샘플입니다." })) : readOnly(context);
  const { data, error } = await getAdminSupabase().from("pickup_locations").select("*").eq("is_active", true).order("name");
  return error ? context.json(apiFailure("QUERY_FAILED", "픽업 장소를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ locations: data ?? [], source: "supabase" }));
});
ordersRouter.get("/pickup-locations/:locationId/slots", async (context) => {
  if (!isSupabaseConfigured()) return readOnly(context);
  const { data, error } = await getAdminSupabase().from("pickup_slots").select("*").eq("location_id", context.req.param("locationId")).eq("is_active", true).gt("pickup_at", new Date().toISOString()).order("pickup_at");
  return error ? context.json(apiFailure("QUERY_FAILED", "픽업 슬롯을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ slots: data ?? [], source: "supabase" }));
});
ordersRouter.get("/orders", async (context) => {
  if (!context.var.currentUser) return context.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  if (!isSupabaseConfigured()) return readOnly(context);
  const { data, error } = await getAdminSupabase().from("orders").select("*,order_items(*),fulfillment_groups(*)").eq("user_id", context.var.currentUser.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "주문을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ orders: (data ?? []).map((row) => serializeOrder(row)), source: "supabase" }));
});
ordersRouter.get("/orders/:id", async (context) => {
  if (!context.var.currentUser) return context.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  const { data, error } = await getOrder(context.req.param("id"));
  if (error) return context.json(apiFailure("QUERY_FAILED", "주문을 조회하지 못했습니다."), 502);
  if (!data || data.user_id !== context.var.currentUser.id) return context.json(apiFailure("NOT_FOUND", "주문을 찾을 수 없습니다."), 404);
  return context.json(apiSuccess({ order: serializeOrder(data), items: data.order_items ?? [], fulfillmentGroups: data.fulfillment_groups ?? [], source: "supabase" }));
});
ordersRouter.post("/orders", async (context) => {
  if (!isSupabaseConfigured()) return readOnly(context);
  if (!context.var.currentUser) return context.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  const raw = await context.req.json().catch(() => null) as Record<string, unknown> | null;
  if (raw && !raw.idempotencyKey) raw.idempotencyKey = context.req.header("idempotency-key") ?? "";
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "주문 정보와 Idempotency-Key를 확인하세요.", parsed.error.flatten()), 400);
  const { data, error } = await getAdminSupabase().rpc("create_order_atomic", { p_actor_id: context.var.currentUser.id, p_pickup_location_id: parsed.data.pickupLocationId, p_pickup_slot_id: parsed.data.pickupSlotId, p_payment_method: parsed.data.paymentMethod, p_idempotency_key: parsed.data.idempotencyKey, p_delivery_address: parsed.data.deliveryAddress ?? null, p_items: parsed.data.items.map((item) => ({ product_id: item.productId, deal_id: item.dealId ?? null, quantity: item.quantity })) });
  if (error) { logError({ source: "backend", message: `create_order_atomic: ${error.message}`, path: context.req.path, method: context.req.method, statusCode: 409, userId: context.var.currentUser.id }); return context.json(apiFailure("ORDER_CREATE_FAILED", safeUserMessage(error.message, "주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.")), 409); }
  const result = (data ?? {}) as { order_id?: string; order?: Record<string, unknown>; replayed?: boolean };
  const current = result.order ?? (result.order_id ? (await getOrder(result.order_id)).data : null);
  return context.json(apiSuccess({ order: current ? serializeOrder(current) : null, replayed: Boolean(result.replayed), payment: { method: parsed.data.paymentMethod, status: paymentStatusOf(parsed.data.paymentMethod), provider: parsed.data.paymentMethod === "card" ? "toss" : null }, source: "supabase" }), result.replayed ? 200 : 201);
});
ordersRouter.post("/orders/:id/cancel", async (context) => {
  if (!isSupabaseConfigured()) return readOnly(context);
  if (!context.var.currentUser) return context.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  const existing = await getOrder(context.req.param("id")); const row = existing.data as OrderRow | null;
  if (!row || (context.var.currentUser.role !== "admin" && row.user_id !== context.var.currentUser.id)) return context.json(apiFailure("NOT_FOUND", "주문을 찾을 수 없습니다."), 404);
  const supabase = getAdminSupabase();
  let refund: "not_applicable" | "refunded" = "not_applicable";
  if (row.payment_method === "card" && row.payment_status === "paid") {
    const { data: payment } = await supabase.from("payments").select("payment_key").eq("order_id", row.id).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!payment?.payment_key) return context.json(apiFailure("REFUND_FAILED", "결제 정보를 찾을 수 없어 환불할 수 없습니다."), 409);
    const cancelResult = await cancelTossPayment(payment.payment_key, "고객 주문 취소");
    if (!cancelResult.ok) { logError({ source: "backend", message: `cancelTossPayment: ${JSON.stringify(cancelResult.body)}`, path: context.req.path, method: context.req.method, statusCode: 502, userId: context.var.currentUser.id }); return context.json(apiFailure("REFUND_FAILED", safeUserMessage((cancelResult.body as { message?: string }).message, "토스 결제 취소에 실패했습니다.")), 502); }
    await supabase.from("payments").update({ status: "cancelled", raw_response: cancelResult.body, updated_at: new Date().toISOString() }).eq("payment_key", payment.payment_key);
    await supabase.from("orders").update({ payment_status: "refunded", updated_at: new Date().toISOString() }).eq("id", row.id);
    refund = "refunded";
  } else if (row.payment_method === "card" && row.payment_status === "pending_payment") {
    await supabase.from("orders").update({ payment_status: "not_applicable", updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  const { data, error } = await supabase.rpc("cancel_order_atomic", { p_order_id: context.req.param("id"), p_actor_id: context.var.currentUser.id });
  if (error) { logError({ source: "backend", message: `cancel_order_atomic: ${error.message}`, path: context.req.path, method: context.req.method, statusCode: 409, userId: context.var.currentUser.id }); return context.json(apiFailure("ORDER_CANCEL_FAILED", safeUserMessage(error.message, "주문을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.")), 409); }
  return context.json(apiSuccess({ ...(data as object), payment: { status: refund === "refunded" ? "refunded" : row.payment_status, refund }, source: "supabase" }));
});

ordersRouter.get("/seller/orders", requireRole("seller"), async (context) => {
  const sellerId = context.var.currentUser!.id; const supabase = getAdminSupabase();
  const { data: groups, error } = await supabase.from("fulfillment_groups").select("id,order_id,status,pickup_status,subtotal,created_at").eq("seller_id", sellerId).order("created_at", { ascending: false });
  if (error) return context.json(apiFailure("QUERY_FAILED", "판매자 주문을 조회하지 못했습니다."), 502);
  const groupIds = (groups ?? []).map((group) => group.id); if (!groupIds.length) return context.json(apiSuccess({ fulfillments: [] }));
  const [itemsResult, ordersResult] = await Promise.all([supabase.from("order_items").select("id,fulfillment_group_id,product_id,product_name,quantity,unit_price,line_total").in("fulfillment_group_id", groupIds), supabase.from("orders").select("id,order_number,pickup_location_id,pickup_slot_id,payment_method,delivery_address,created_at").in("id", [...new Set((groups ?? []).map((group) => group.order_id))])]);
  if (itemsResult.error || ordersResult.error) return context.json(apiFailure("QUERY_FAILED", "판매자 주문 상세를 조회하지 못했습니다."), 502);
  const fulfillments = (groups ?? []).map((group) => ({ id: group.id, orderId: group.order_id, orderNumber: ordersResult.data?.find((order) => order.id === group.order_id)?.order_number, pickupLocationId: ordersResult.data?.find((order) => order.id === group.order_id)?.pickup_location_id, pickupSlotId: ordersResult.data?.find((order) => order.id === group.order_id)?.pickup_slot_id, paymentMethod: ordersResult.data?.find((order) => order.id === group.order_id)?.payment_method, deliveryAddress: ordersResult.data?.find((order) => order.id === group.order_id)?.delivery_address, status: group.status, pickupStatus: group.pickup_status, subtotal: group.subtotal, createdAt: group.created_at, items: itemsResult.data?.filter((item) => item.fulfillment_group_id === group.id) ?? [] }));
  return context.json(apiSuccess({ fulfillments, source: "supabase" }));
});
ordersRouter.patch("/seller/fulfillments/:id/status", requireRole("seller"), async (context) => {
  const parsed = groupStatusSchema.safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "상태를 확인하세요."), 400);
  const supabase = getAdminSupabase(); const { data: group } = await supabase.from("fulfillment_groups").select("status").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!group) return context.json(apiFailure("NOT_FOUND", "담당 fulfillment를 찾을 수 없습니다."), 404);
  if (!(transitions[group.status] ?? []).includes(parsed.data.status)) return context.json(apiFailure("INVALID_STATUS_TRANSITION", "허용되지 않는 상태 전이입니다."), 409);
  const pickupStatus = parsed.data.pickupStatus ?? (parsed.data.status === "ready" ? "ready" : parsed.data.status === "completed" ? "collected" : undefined);
  const { data, error } = await supabase.from("fulfillment_groups").update({ status: parsed.data.status, ...(pickupStatus ? { pickup_status: pickupStatus } : {}), updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).select().single();
  return error ? context.json(apiFailure("STATUS_UPDATE_FAILED", "상태를 변경하지 못했습니다."), 409) : context.json(apiSuccess({ fulfillment: data }));
});
ordersRouter.get("/admin/orders", requireRole("admin"), async (context) => {
  const { data, error } = await getAdminSupabase().from("orders").select("*,order_items(*),fulfillment_groups(*)").order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "관리자 주문을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ orders: (data ?? []).map((row) => serializeOrder(row)), source: "supabase" }));
});
ordersRouter.patch("/admin/fulfillments/:id/status", requireRole("admin"), async (context) => {
  const parsed = groupStatusSchema.safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "상태를 확인하세요."), 400);
  const supabase = getAdminSupabase(); const { data: group } = await supabase.from("fulfillment_groups").select("status").eq("id", context.req.param("id")).maybeSingle();
  if (!group) return context.json(apiFailure("NOT_FOUND", "fulfillment를 찾을 수 없습니다."), 404);
  if (!(transitions[group.status] ?? []).includes(parsed.data.status)) return context.json(apiFailure("INVALID_STATUS_TRANSITION", "허용되지 않는 상태 전이입니다."), 409);
  const pickupStatus = parsed.data.pickupStatus ?? (parsed.data.status === "ready" ? "ready" : parsed.data.status === "completed" ? "collected" : undefined);
  const { data, error } = await supabase.from("fulfillment_groups").update({ status: parsed.data.status, ...(pickupStatus ? { pickup_status: pickupStatus } : {}), updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).select().single();
  return error ? context.json(apiFailure("STATUS_UPDATE_FAILED", "상태를 변경하지 못했습니다."), 409) : context.json(apiSuccess({ fulfillment: data }));
});
