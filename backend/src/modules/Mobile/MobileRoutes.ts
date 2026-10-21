/**
 * 타임딜 모바일 앱(Flutter, timedeal-mobile)이 웹과 같은 DB를 쓰도록 맞춘 어댑터 API입니다.
 * 웹의 상품+딜, 주문, 판매자 fulfillment를 모바일 앱이 쓰던 "평평한 딜 / 예약" 모양으로 바꿔서 돌려줍니다.
 * 앱에서 예약하면 웹 주문(reservation_only)으로 저장되어 웹 판매자 센터에도 그대로 보입니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config, isSupabaseConfigured } from "../../config.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
import { computeEffectiveDealPrice } from "../../deal-pricing.js";
import { ensureUpcomingSlots } from "../../pickup-slots.js";
import { safeUserMessage } from "../../safe-message.js";

export const mobileRouter = new Hono();

// 픽업 거점 좌표(OpenStreetMap 지오코딩 결과). 주소가 없는 거점은 성수동 중심 근처로 표시합니다.
const LOCATION_COORDS: Record<string, [number, number]> = {
  "서울 성동구 왕십리로 96": [37.5456157, 127.0447497],
  "서울 성동구 성수이로 20": [37.5417962, 127.0560972],
  "서울 성동구 왕십리로4길 13": [37.5459903, 127.0458505],
  "서울 성동구 아차산로 17길 22": [37.5443762, 127.0644207],
  "서울 성동구 아차산로17길 22": [37.5443762, 127.0644207],
  "서울 성동구 연무장길 9": [37.5431108, 127.0539725],
};
const SEONGSU_CENTER: [number, number] = [37.5446, 127.0557];

type Location = { id: string; name: string; address: string };
type DealRow = {
  id: string; product_id: string; deal_price: number; participants: number; target: number; ends_at: string; created_at: string;
  auto_discount_enabled?: boolean | null; auto_discount_start_hours?: number | null; auto_discount_max_percent?: number | null;
  product?: { id: string; name: string; description: string; category: string; image: string; regular_price: number; inventory: number; seller_id: string | null } | null;
};

const hash = (value: string) => { let h = 0; for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

// 웹 카테고리 → 모바일 앱 카테고리 탭/아이콘
function mobileCategory(category: string): { storeCategory: string; icon: string } {
  if (/베이커리|빵|델리/.test(category)) return { storeCategory: "베이커리", icon: "wheat" };
  if (/커피|음료|카페|디저트/.test(category)) return { storeCategory: "카페", icon: "coffee" };
  if (/꽃|플라워/.test(category)) return { storeCategory: "꽃집", icon: "flower2" };
  if (/간편식|밀키트|신선식품|정육|수산|반찬|음식/.test(category)) return { storeCategory: "음식", icon: "utensils" };
  return { storeCategory: "마트", icon: "shoppingCart" };
}

async function activeLocations(): Promise<Location[]> {
  const { data } = await getAdminSupabase().from("pickup_locations").select("id,name,address").eq("is_active", true).order("name");
  return (data ?? []) as Location[];
}

// 딜마다 픽업 거점 하나를 상품 기준으로 고정 배정합니다(지도에 거점별로 고르게 퍼지도록).
const locationFor = (deal: DealRow, locations: Location[]) =>
  locations.length ? locations[hash(deal.product_id) % locations.length] : null;

function toMobileDeal(deal: DealRow, locations: Location[]) {
  const product = deal.product;
  const location = locationFor(deal, locations);
  const [baseLat, baseLng] = (location && LOCATION_COORDS[location.address]) ?? SEONGSU_CENTER;
  const jitter = location && LOCATION_COORDS[location.address] ? 0 : ((hash(deal.id) % 100) - 50) * 0.00008;
  const { effectivePrice } = computeEffectiveDealPrice({ dealPrice: deal.deal_price, endsAt: deal.ends_at, autoDiscountEnabled: deal.auto_discount_enabled ?? false, autoDiscountStartHours: deal.auto_discount_start_hours ?? 0, autoDiscountMaxPercent: deal.auto_discount_max_percent ?? 0 });
  const inventory = Math.max(product?.inventory ?? 0, 0);
  const { storeCategory, icon } = mobileCategory(product?.category ?? "");
  return {
    id: deal.id,
    product_id: deal.product_id,
    store_id: product?.seller_id ?? "",
    store_name: location?.name ?? "우리 동네 가게",
    store_category: storeCategory,
    web_category: product?.category ?? "",
    title: product?.name ?? "타임딜 상품",
    description: product?.description ?? "",
    original_price: product?.regular_price ?? deal.deal_price,
    discounted_price: effectivePrice,
    total_stock: Math.max(inventory + (deal.participants ?? 0), 1),
    remaining_stock: inventory,
    expires_at: deal.ends_at,
    created_at: deal.created_at,
    icon_name: icon,
    image_url: product?.image ?? "",
    store_lat: baseLat + jitter,
    store_lng: baseLng + jitter,
    neighborhood: "성수동 2가",
    pickup_location_id: location?.id ?? null,
    pickup_address: location?.address ?? null,
  };
}

const DEAL_SELECT = "id,product_id,deal_price,participants,target,ends_at,created_at,auto_discount_enabled,auto_discount_start_hours,auto_discount_max_percent,product:products(id,name,description,category,image,regular_price,inventory,seller_id,status)";

mobileRouter.get("/mobile/deals", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiFailure("SUPABASE_UNCONFIGURED", "데이터베이스가 연결되지 않았습니다."), 503);
  const nowIso = new Date().toISOString();
  const [{ data, error }, locations] = await Promise.all([
    getAdminSupabase().from("deals").select(DEAL_SELECT).eq("status", "active").lte("starts_at", nowIso).gt("ends_at", nowIso).order("created_at", { ascending: false }),
    activeLocations(),
  ]);
  if (error) return context.json(apiFailure("QUERY_FAILED", "타임딜을 조회하지 못했습니다."), 502);
  const deals = ((data ?? []) as unknown as (DealRow & { product: { status?: string } | null })[])
    .filter((deal) => deal.product && deal.product.status === "active")
    .map((deal) => toMobileDeal(deal, locations));
  return context.json(apiSuccess({ deals }));
});

// ── 예약 ─────────────────────────────────────────────────────────
type OrderRow = {
  id: string; user_id: string; created_at: string; order_status: string; payment_method: string; total_amount: number; pickup_status?: string;
  order_items?: { product_id: string; deal_id: string | null; quantity: number; line_total: number; fulfillment_group_id?: string | null }[];
  fulfillment_groups?: { id: string; seller_id: string; status: string; pickup_status: string }[];
};

function reservationStatus(orderStatus: string, group?: { status: string; pickup_status: string } | null) {
  if (orderStatus === "cancelled" || group?.status === "cancelled") return { status: "취소", payment_status: "cancelled" };
  if (group?.pickup_status === "no_show") return { status: "노쇼", payment_status: "captured" };
  if (group?.status === "completed" || group?.pickup_status === "collected" || orderStatus === "completed") return { status: "픽업완료", payment_status: "released" };
  return { status: "진행중", payment_status: "holding" };
}

const paymentLabel = (method: string) => (method === "card" ? "신용/체크카드" : method === "on_site" ? "현장결제" : "현장결제 예약");

async function dealsById(ids: string[]) {
  if (ids.length === 0) return new Map<string, ReturnType<typeof toMobileDeal>>();
  const [{ data }, locations] = await Promise.all([getAdminSupabase().from("deals").select(DEAL_SELECT).in("id", ids), activeLocations()]);
  return new Map(((data ?? []) as unknown as DealRow[]).map((deal) => [deal.id, toMobileDeal(deal, locations)]));
}

mobileRouter.get("/mobile/reservations", requireAuth, async (context) => {
  const { data, error } = await getAdminSupabase().from("orders").select("id,user_id,created_at,order_status,payment_method,total_amount,order_items(product_id,deal_id,quantity,line_total),fulfillment_groups(id,seller_id,status,pickup_status)").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false }).limit(100);
  if (error) return context.json(apiFailure("QUERY_FAILED", "예약을 조회하지 못했습니다."), 502);
  const orders = (data ?? []) as OrderRow[];
  const dealMap = await dealsById([...new Set(orders.flatMap((order) => (order.order_items ?? []).map((item) => item.deal_id).filter(Boolean) as string[]))]);
  const reservations = orders.flatMap((order) => {
    const item = order.order_items?.[0]; const deal = item?.deal_id ? dealMap.get(item.deal_id) : undefined;
    if (!deal) return [];
    return [{ id: order.id, user_id: order.user_id, deals: deal, reserved_at: order.created_at, deposit_amount: order.total_amount, payment_method: paymentLabel(order.payment_method), ...reservationStatus(order.order_status, order.fulfillment_groups?.[0]) }];
  });
  return context.json(apiSuccess({ reservations }));
});

const reserveInput = z.object({ paymentMethod: z.string().max(40).optional(), quantity: z.number().int().min(1).max(20).optional(), idempotencyKey: z.string().min(8).max(120).optional() }).strict();
mobileRouter.post("/mobile/deals/:id/reserve", requireAuth, async (context) => {
  const parsed = reserveInput.safeParse(await context.req.json().catch(() => ({})));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "예약 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const [{ data: deal }, locations] = await Promise.all([supabase.from("deals").select(DEAL_SELECT).eq("id", context.req.param("id")).eq("status", "active").maybeSingle(), activeLocations()]);
  if (!deal) return context.json(apiFailure("NOT_FOUND", "딜을 찾을 수 없거나 마감되었습니다."), 404);
  const location = locationFor(deal as unknown as DealRow, locations);
  if (!location) return context.json(apiFailure("NO_PICKUP_LOCATION", "픽업 거점이 없습니다."), 409);
  let slots;
  try { slots = await ensureUpcomingSlots(location.id); } catch { return context.json(apiFailure("SLOT_FAILED", "픽업 시간을 준비하지 못했습니다."), 502); }
  if (!slots.length) return context.json(apiFailure("NO_PICKUP_SLOT", "예약 가능한 픽업 시간이 없습니다."), 409);
  const idempotencyKey = parsed.data.idempotencyKey ?? `mobile-${context.var.currentUser!.id}-${deal.id}-${Date.now()}`;
  const { data, error } = await supabase.rpc("create_order_atomic", { p_actor_id: context.var.currentUser!.id, p_pickup_location_id: location.id, p_pickup_slot_id: slots[0].id, p_payment_method: "reservation_only", p_idempotency_key: idempotencyKey, p_delivery_address: null, p_items: [{ product_id: deal.product_id, deal_id: deal.id, quantity: parsed.data.quantity ?? 1 }] });
  if (error) return context.json(apiFailure("ORDER_CREATE_FAILED", safeUserMessage(error.message, "예약하지 못했습니다. 잠시 후 다시 시도해 주세요.")), 409);
  const result = (data ?? {}) as { order_id?: string; order?: { id?: string } };
  const orderId = result.order_id ?? result.order?.id ?? null;
  return context.json(apiSuccess({ orderId, reservation: { id: orderId, user_id: context.var.currentUser!.id, deals: toMobileDeal(deal as unknown as DealRow, locations), reserved_at: new Date().toISOString(), deposit_amount: toMobileDeal(deal as unknown as DealRow, locations).discounted_price, payment_method: parsed.data.paymentMethod ?? "현장결제 예약", status: "진행중", payment_status: "holding" } }), 201);
});

// ── 사장님(판매자) 화면 ───────────────────────────────────────────
const sellerOnly = requireRole("seller", "admin");
mobileRouter.get("/mobile/merchant/reservations", sellerOnly, async (context) => {
  const supabase = getAdminSupabase();
  const { data: groups, error } = await supabase.from("fulfillment_groups").select("id,order_id,seller_id,status,pickup_status,created_at").eq("seller_id", context.var.currentUser!.id).order("created_at", { ascending: false }).limit(200);
  if (error) return context.json(apiFailure("QUERY_FAILED", "예약을 조회하지 못했습니다."), 502);
  const groupIds = (groups ?? []).map((group) => group.id); const orderIds = (groups ?? []).map((group) => group.order_id);
  if (groupIds.length === 0) return context.json(apiSuccess({ reservations: [] }));
  const [{ data: items }, { data: orders }] = await Promise.all([
    supabase.from("order_items").select("fulfillment_group_id,deal_id,line_total").in("fulfillment_group_id", groupIds),
    supabase.from("orders").select("id,user_id,order_status,payment_method").in("id", orderIds),
  ]);
  const dealMap = await dealsById([...new Set((items ?? []).map((item) => item.deal_id).filter(Boolean) as string[])]);
  const reservations = (groups ?? []).flatMap((group) => {
    const item = (items ?? []).find((row) => row.fulfillment_group_id === group.id); const order = (orders ?? []).find((row) => row.id === group.order_id);
    const deal = item?.deal_id ? dealMap.get(item.deal_id) : undefined;
    if (!deal || !order) return [];
    return [{ id: group.id, user_id: order.user_id, deals: deal, reserved_at: group.created_at, deposit_amount: item?.line_total ?? deal.discounted_price, payment_method: paymentLabel(order.payment_method), ...reservationStatus(order.order_status, group) }];
  });
  return context.json(apiSuccess({ reservations }));
});

const merchantAction = z.object({ action: z.enum(["complete", "no_show"]) }).strict();
mobileRouter.post("/mobile/merchant/reservations/:id/status", sellerOnly, async (context) => {
  const parsed = merchantAction.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "처리할 상태를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: group } = await supabase.from("fulfillment_groups").select("id,status").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!group) return context.json(apiFailure("NOT_FOUND", "예약을 찾을 수 없습니다."), 404);
  if (group.status === "cancelled") return context.json(apiFailure("ALREADY_CANCELLED", "이미 취소된 예약입니다."), 409);
  const update = parsed.data.action === "complete" ? { status: "completed", pickup_status: "collected" } : { status: "completed", pickup_status: "no_show" };
  const { error } = await supabase.from("fulfillment_groups").update({ ...update, updated_at: new Date().toISOString() }).eq("id", group.id);
  return error ? context.json(apiFailure("UPDATE_FAILED", "상태를 바꾸지 못했습니다."), 500) : context.json(apiSuccess({ id: group.id, ...update }));
});

mobileRouter.post("/mobile/merchant/deals/:id/close", sellerOnly, async (context) => {
  const supabase = getAdminSupabase();
  const { data: deal } = await supabase.from("deals").select("id,product:products(seller_id)").eq("id", context.req.param("id")).maybeSingle();
  const sellerId = (deal as unknown as { product?: { seller_id?: string } } | null)?.product?.seller_id;
  if (!deal || (sellerId !== context.var.currentUser!.id && context.var.currentUser!.role !== "admin")) return context.json(apiFailure("NOT_FOUND", "딜을 찾을 수 없습니다."), 404);
  const { error } = await supabase.from("deals").update({ status: "ended", ends_at: new Date().toISOString() }).eq("id", deal.id);
  return error ? context.json(apiFailure("UPDATE_FAILED", "딜을 마감하지 못했습니다."), 500) : context.json(apiSuccess({ id: deal.id, status: "ended" }));
});

// 사장님 앱의 "딜 올리기": 상품+딜을 한 번에 등록합니다. 이미지는 업로드한 Storage 경로나 https 이미지 주소 둘 다 받습니다.
const APP_TO_WEB_CATEGORY: Record<string, string> = { 베이커리: "베이커리·델리", 음식: "간편식·밀키트", 카페: "음료·우유", 마트: "신선식품", 꽃집: "생활용품" };
const merchantDealInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(3000),
  category: z.string().min(1).max(60),
  originalPrice: z.number().int().min(1).max(100_000_000),
  discountedPrice: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(1).max(100_000),
  hours: z.number().min(0.5).max(168),
  imagePath: z.string().min(3).max(500).regex(/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i).optional(),
  imageUrl: z.string().url().startsWith("https://").max(1000).optional(),
}).strict().refine((input) => input.discountedPrice <= input.originalPrice, "할인가는 정상가를 넘을 수 없습니다.");
mobileRouter.post("/mobile/merchant/deals", sellerOnly, async (context) => {
  const parsed = merchantDealInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "딜 정보를 확인하세요.", parsed.error.flatten()), 400);
  const input = parsed.data; const supabase = getAdminSupabase();
  const image = input.imagePath ? supabase.storage.from(config.productImageBucket).getPublicUrl(input.imagePath).data.publicUrl : input.imageUrl;
  if (!image) return context.json(apiFailure("INVALID_IMAGE", "상품 사진이 필요합니다."), 400);
  const { data: product, error: productError } = await supabase.from("products").insert({ seller_id: context.var.currentUser!.id, name: input.title, description: input.description, category: APP_TO_WEB_CATEGORY[input.category] ?? input.category, image, image_path: input.imagePath ?? null, regular_price: input.originalPrice, inventory: input.stock, status: "active" }).select().single();
  if (productError || !product) return context.json(apiFailure("SAVE_FAILED", "상품을 저장하지 못했습니다."), 400);
  const startsAt = new Date(Date.now() - 60_000).toISOString(); const endsAt = new Date(Date.now() + input.hours * 3600_000).toISOString();
  const { data: deal, error: dealError } = await supabase.from("deals").insert({ product_id: product.id, deal_price: input.discountedPrice, target: input.stock, starts_at: startsAt, ends_at: endsAt, status: "active", auto_discount_enabled: false }).select(DEAL_SELECT).single();
  if (dealError || !deal) { await supabase.from("products").delete().eq("id", product.id); return context.json(apiFailure("SAVE_FAILED", "딜을 저장하지 못했습니다."), 400); }
  return context.json(apiSuccess({ deal: toMobileDeal(deal as unknown as DealRow, await activeLocations()) }), 201);
});
