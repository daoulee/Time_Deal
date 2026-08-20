/**
 * 판매자 상품·이미지 Storage·딜·재고·픽업·대시보드 API를 제공합니다.
 * seller는 자신의 데이터만 다루며 모든 변경 입력은 strict allowlist로 시스템 필드 과다 할당을 차단합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config } from "../../config.js";
import { requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const sellerRouter = new Hono();
const sellerOnly = requireRole("seller", "admin");
const imagePath = z.string().min(3).max(500).regex(/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i);
const productCreate = z.object({ name: z.string().min(2).max(120), description: z.string().min(2).max(3000), category: z.string().min(1).max(60), image: imagePath, regularPrice: z.number().int().min(0).max(100_000_000), inventory: z.number().int().min(0).max(1_000_000) }).strict();
const productPatch = productCreate.partial().refine((input) => Object.keys(input).length > 0, "수정 필드가 필요합니다.");
const dealCreate = z.object({ productId: z.string().min(1).max(120), dealPrice: z.number().int().min(0).max(100_000_000), target: z.number().int().min(1).max(1_000_000), startsAt: z.string().datetime(), endsAt: z.string().datetime() }).strict().refine((input) => new Date(input.endsAt) > new Date(input.startsAt), "종료 시각은 시작 시각보다 늦어야 합니다.");
const dealPatch = z.object({ dealPrice: z.number().int().min(0).max(100_000_000).optional(), target: z.number().int().min(1).max(1_000_000).optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional() }).strict().refine((input) => Object.keys(input).length > 0, "수정 필드가 필요합니다.");
const mapProduct = (input: z.infer<typeof productPatch>): Record<string, unknown> => ({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.category !== undefined ? { category: input.category } : {}), ...(input.image !== undefined ? { image: input.image, image_path: input.image } : {}), ...(input.regularPrice !== undefined ? { regular_price: input.regularPrice } : {}), ...(input.inventory !== undefined ? { inventory: input.inventory } : {}), updated_at: new Date().toISOString() });

sellerRouter.get("/seller-products", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("products").select("*").eq("seller_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "상품을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ products: data ?? [] }));
});
sellerRouter.post("/seller-products", sellerOnly, async (context) => {
  const parsed = productCreate.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "상품 정보를 확인하세요.", parsed.error.flatten()), 400);
  const { data, error } = await getAdminSupabase().from("products").insert({ seller_id: context.var.currentUser!.id, ...mapProduct(parsed.data), status: "draft" }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "상품을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ product: data }), 201);
});
sellerRouter.patch("/seller-products/:id", sellerOnly, async (context) => {
  const parsed = productPatch.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "허용된 상품 수정 정보를 확인하세요.", parsed.error.flatten()), 400);
  const { data, error } = await getAdminSupabase().from("products").update(mapProduct(parsed.data)).eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).in("status", ["draft", "rejected", "hidden"]).select().maybeSingle();
  if (error) return context.json(apiFailure("SAVE_FAILED", "상품을 수정하지 못했습니다."), 400);
  return data ? context.json(apiSuccess({ product: data })) : context.json(apiFailure("NOT_EDITABLE", "본인의 초안·반려·숨김 상품만 수정할 수 있습니다."), 409);
});
sellerRouter.post("/seller-products/:id/submit", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("products").update({ status: "pending_review", rejection_reason: null, updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).in("status", ["draft", "rejected"]).select().maybeSingle();
  return error || !data ? context.json(apiFailure("SUBMIT_FAILED", "검수 요청할 상품을 찾을 수 없습니다."), 409) : context.json(apiSuccess({ product: data }));
});
sellerRouter.post("/seller-products/:id/hide", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("products").update({ status: "hidden", updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).in("status", ["active", "pending_review"]).select().maybeSingle();
  return error || !data ? context.json(apiFailure("HIDE_FAILED", "숨길 수 있는 본인 상품을 찾을 수 없습니다."), 409) : context.json(apiSuccess({ product: data }));
});
sellerRouter.post("/seller-products/:id/image-upload-url", sellerOnly, async (context) => {
  const owned = await getAdminSupabase().from("products").select("id").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!owned.data) return context.json(apiFailure("NOT_FOUND", "상품을 찾을 수 없습니다."), 404);
  const parsed = z.object({ fileName: z.string().min(1).max(120).regex(/\.(?:jpe?g|png|webp)$/i), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(config.maxImageBytes) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_IMAGE", "JPG·PNG·WEBP 이미지만 제한 크기 내에서 업로드할 수 있습니다."), 400);
  const objectPath = `${context.var.currentUser!.id}/${crypto.randomUUID()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { data, error } = await getAdminSupabase().storage.from(config.productImageBucket).createSignedUploadUrl(objectPath);
  return error ? context.json(apiFailure("UPLOAD_URL_FAILED", "이미지 업로드 URL을 만들지 못했습니다."), 502) : context.json(apiSuccess({ bucket: config.productImageBucket, objectPath, signedUrl: data.signedUrl, token: data.token }));
});

sellerRouter.get("/seller-deals", sellerOnly, async (context) => {
  const { data: products } = await getAdminSupabase().from("products").select("id").eq("seller_id", context.var.currentUser!.id);
  const ids = (products ?? []).map((item) => item.id);
  if (!ids.length) return context.json(apiSuccess({ deals: [] }));
  const { data, error } = await getAdminSupabase().from("deals").select("*,products(name,regular_price)").in("product_id", ids).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "딜을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ deals: data ?? [] }));
});
sellerRouter.post("/seller-deals", sellerOnly, async (context) => {
  const parsed = dealCreate.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "딜 정보를 확인하세요.", parsed.error.flatten()), 400);
  const { data: product } = await getAdminSupabase().from("products").select("id,regular_price").eq("id", parsed.data.productId).eq("seller_id", context.var.currentUser!.id).eq("status", "active").maybeSingle();
  if (!product || parsed.data.dealPrice > product.regular_price) return context.json(apiFailure("INVALID_DEAL", "활성화된 본인 상품과 정상 할인 가격을 확인하세요."), 400);
  const { data, error } = await getAdminSupabase().from("deals").insert({ product_id: parsed.data.productId, deal_price: parsed.data.dealPrice, target: parsed.data.target, starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, status: "draft" }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "딜을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ deal: data }), 201);
});
sellerRouter.patch("/seller-deals/:id", sellerOnly, async (context) => {
  const parsed = dealPatch.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "딜 수정 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: current } = await supabase.from("deals").select("*,products!inner(seller_id,regular_price)").eq("id", context.req.param("id")).eq("products.seller_id", context.var.currentUser!.id).in("status", ["draft", "active"]).maybeSingle();
  if (!current) return context.json(apiFailure("NOT_EDITABLE", "수정 가능한 본인 딜을 찾을 수 없습니다."), 409);
  const startsAt = parsed.data.startsAt ?? current.starts_at; const endsAt = parsed.data.endsAt ?? current.ends_at;
  if (new Date(endsAt) <= new Date(startsAt) || (parsed.data.target !== undefined && parsed.data.target < Number(current.participants)) || (parsed.data.dealPrice !== undefined && parsed.data.dealPrice > Number(current.products.regular_price))) return context.json(apiFailure("INVALID_DEAL", "가격·목표·운영 시간을 확인하세요."), 400);
  const update = { ...(parsed.data.dealPrice !== undefined ? { deal_price: parsed.data.dealPrice } : {}), ...(parsed.data.target !== undefined ? { target: parsed.data.target } : {}), ...(parsed.data.startsAt ? { starts_at: parsed.data.startsAt } : {}), ...(parsed.data.endsAt ? { ends_at: parsed.data.endsAt } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("deals").update(update).eq("id", current.id).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "딜을 수정하지 못했습니다."), 400) : context.json(apiSuccess({ deal: data }));
});
sellerRouter.post("/seller-deals/:id/end", sellerOnly, async (context) => {
  const supabase = getAdminSupabase();
  const { data: productIds } = await supabase.from("products").select("id").eq("seller_id", context.var.currentUser!.id);
  const ids = (productIds ?? []).map((item) => item.id); if (!ids.length) return context.json(apiFailure("NOT_FOUND", "종료할 딜을 찾을 수 없습니다."), 404);
  const { data, error } = await supabase.from("deals").update({ status: "ended", ends_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).in("product_id", ids).in("status", ["draft", "active"]).select().maybeSingle();
  return error || !data ? context.json(apiFailure("END_FAILED", "종료할 본인 딜을 찾을 수 없습니다."), 409) : context.json(apiSuccess({ deal: data }));
});

sellerRouter.get("/seller-products/:id/inventory", sellerOnly, async (context) => {
  const supabase = getAdminSupabase(); const owned = await supabase.from("products").select("id,inventory").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!owned.data) return context.json(apiFailure("NOT_FOUND", "상품을 찾을 수 없습니다."), 404);
  const { data, error } = await supabase.from("inventory_movements").select("id,product_id,quantity_delta,reason,actor_id,created_at").eq("product_id", owned.data.id).eq("seller_id", context.var.currentUser!.id).order("created_at", { ascending: false }).limit(200);
  return error ? context.json(apiFailure("QUERY_FAILED", "재고 이력을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ inventory: owned.data.inventory, movements: data ?? [] }));
});
sellerRouter.post("/seller-products/:id/inventory", sellerOnly, async (context) => {
  const parsed = z.object({ quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((input) => input !== 0), reason: z.enum(["manual", "restock"]) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "재고 조정 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: product } = await supabase.from("products").select("id,inventory").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!product || product.inventory + parsed.data.quantityDelta < 0) return context.json(apiFailure("INVALID_INVENTORY", "재고가 음수가 될 수 없습니다."), 409);
  const { data, error } = await supabase.from("products").update({ inventory: product.inventory + parsed.data.quantityDelta, updated_at: new Date().toISOString() }).eq("id", product.id).eq("inventory", product.inventory).select().maybeSingle();
  if (error || !data) return context.json(apiFailure("INVENTORY_CONFLICT", "재고가 변경되었습니다. 다시 시도해 주세요."), 409);
  const movement = await supabase.from("inventory_movements").insert({ product_id: product.id, seller_id: context.var.currentUser!.id, quantity_delta: parsed.data.quantityDelta, reason: parsed.data.reason, actor_id: context.var.currentUser!.id }).select().single();
  return movement.error ? context.json(apiFailure("MOVEMENT_SAVE_FAILED", "재고 원장을 저장하지 못했습니다."), 500) : context.json(apiSuccess({ product: data, movement: movement.data }));
});

sellerRouter.get("/seller/pickup-locations", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("pickup_locations").select("*").eq("is_active", true).order("name");
  return error ? context.json(apiFailure("QUERY_FAILED", "픽업 장소를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ locations: data ?? [] }));
});
sellerRouter.get("/seller/pickup-slots", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("pickup_slots").select("*,pickup_locations(name,address)").eq("is_active", true).gte("pickup_date", new Date().toISOString().slice(0, 10)).order("pickup_at");
  return error ? context.json(apiFailure("QUERY_FAILED", "픽업 슬롯을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ slots: data ?? [] }));
});
sellerRouter.get("/seller-dashboard", sellerOnly, async (context) => {
  const supabase = getAdminSupabase(); const sellerId = context.var.currentUser!.id;
  const [products, groups, inquiries, movements] = await Promise.all([supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", sellerId), supabase.from("fulfillment_groups").select("subtotal,status").eq("seller_id", sellerId), supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("assigned_to", sellerId).in("status", ["open", "in_progress"]), supabase.from("inventory_movements").select("quantity_delta").eq("seller_id", sellerId)]);
  if (products.error || groups.error || inquiries.error || movements.error) return context.json(apiFailure("QUERY_FAILED", "대시보드 집계에 실패했습니다."), 502);
  return context.json(apiSuccess({ dashboard: { productCount: products.count ?? 0, fulfillmentCount: groups.data?.length ?? 0, grossReservedAmount: (groups.data ?? []).reduce((sum, group) => sum + Number(group.subtotal), 0), openInquiryCount: inquiries.count ?? 0, inventoryNetChange: (movements.data ?? []).reduce((sum, item) => sum + Number(item.quantity_delta), 0), fulfillmentStatus: Object.fromEntries(["pending", "confirmed", "ready", "completed", "cancelled"].map((status) => [status, (groups.data ?? []).filter((group) => group.status === status).length])) } }));
});
