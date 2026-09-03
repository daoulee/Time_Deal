/**
 * 로그인 사용자의 프로필·관심 지역·주문 기반 참여 딜·구매 검증 리뷰 API를 제공합니다.
 * service-role 사용 시에도 모든 조회·변경을 currentUser 소유 범위로 제한합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const myPageRouter = new Hono();
myPageRouter.use("/me/*", requireAuth);

const reviewImagePath = z.string().min(3).max(500).regex(/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i);
const reviewImageRef = z.union([reviewImagePath, z.string().url().max(2000)]);
const publicImageUrl = (objectPath: string) => getAdminSupabase().storage.from(config.productImageBucket).getPublicUrl(objectPath).data.publicUrl;
const resolveImageRef = (ref: string) => (ref.startsWith("http://") || ref.startsWith("https://") ? ref : publicImageUrl(ref));

type DealRow = { id: string; deal_price: number; status: string; starts_at: string; ends_at: string };
type ProductWithDealsRow = { id: string; name: string; image: string; category: string; regular_price: number; status: string; deals?: DealRow[] | null };
function resolveActiveDeal(deals: DealRow[] | null | undefined) {
  const now = Date.now();
  return (deals ?? []).find((deal) => deal.status === "active" && new Date(deal.starts_at).getTime() <= now && new Date(deal.ends_at).getTime() > now) ?? null;
}
function serializeCatalogItem(product: ProductWithDealsRow | null) {
  if (!product) return { product: null, deal: null };
  const activeDeal = resolveActiveDeal(product.deals);
  return {
    product: { id: product.id, name: product.name, image: product.image, category: product.category, regularPrice: product.regular_price, status: product.status },
    deal: activeDeal ? { id: activeDeal.id, dealPrice: activeDeal.deal_price } : null,
  };
}
const sellerApplicationInput = z.object({ businessName: z.string().min(2).max(120), businessNumber: z.string().regex(/^[0-9-]{10,20}$/, "사업자등록번호 형식을 확인하세요.") }).strict();
myPageRouter.get("/me/seller-application", async (context) => {
  const { data, error } = await getAdminSupabase().from("seller_applications").select("id,business_name,business_number,status,review_reason,reviewed_at,created_at").eq("user_id", context.var.currentUser!.id).maybeSingle();
  return error ? context.json(apiFailure("QUERY_FAILED", "판매자 신청 상태를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ application: data ?? null }));
});
myPageRouter.post("/me/seller-application", async (context) => {
  const parsed = sellerApplicationInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "사업자명과 사업자등록번호를 확인하세요.", parsed.error.flatten()), 400);
  const supabase = getAdminSupabase();
  const existing = await supabase.from("seller_applications").select("id,status").eq("user_id", context.var.currentUser!.id).maybeSingle();
  if (existing.data && existing.data.status !== "rejected") return context.json(apiFailure("ALREADY_APPLIED", existing.data.status === "approved" ? "이미 승인된 판매자 계정입니다." : "이미 심사 중인 신청이 있습니다."), 409);
  const { data, error } = await supabase.from("seller_applications").upsert({ user_id: context.var.currentUser!.id, business_name: parsed.data.businessName, business_number: parsed.data.businessNumber, status: "pending", review_reason: null, reviewed_by: null, reviewed_at: null }, { onConflict: "user_id" }).select("id,business_name,business_number,status,created_at").single();
  return error ? context.json(apiFailure("SAVE_FAILED", "판매자 신청을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ application: data }), 201);
});
myPageRouter.use("/participations", requireAuth);
myPageRouter.use("/participations/*", requireAuth);
myPageRouter.use("/reviews", requireAuth);
myPageRouter.use("/reviews/*", requireAuth);
myPageRouter.get("/me/profile", async (context) => {
  const { data, error } = await getAdminSupabase().from("profiles").select("id,name,role,phone,preferred_region,marketing_opt_in,created_at").eq("id", context.var.currentUser!.id).single();
  return error ? context.json(apiFailure("QUERY_FAILED", "프로필을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ profile: { ...data, email: context.var.currentUser!.email, emailVerified: context.var.currentUser!.emailVerified } }));
});
myPageRouter.patch("/me/profile", async (context) => {
  const parsed = z.object({ name: z.string().min(2).max(50).optional(), phone: z.string().regex(/^$|^[0-9+ -]{8,20}$/).optional(), preferredRegion: z.string().max(100).optional(), marketingOptIn: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "프로필 정보를 확인하세요.", parsed.error.flatten()), 400);
  const update = { ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}), ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}), ...(parsed.data.preferredRegion !== undefined ? { preferred_region: parsed.data.preferredRegion || null } : {}), ...(parsed.data.marketingOptIn !== undefined ? { marketing_opt_in: parsed.data.marketingOptIn } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await getAdminSupabase().from("profiles").update(update).eq("id", context.var.currentUser!.id).select("id,name,role,phone,preferred_region,marketing_opt_in").single();
  return error ? context.json(apiFailure("SAVE_FAILED", "프로필을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ profile: data }));
});
myPageRouter.get("/participations", async (context) => {
  const { data, error } = await getAdminSupabase().from("participations").select("*,deals(*,products(id,name,image,category))").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "참여 딜을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ participations: data ?? [] }));
});
myPageRouter.get("/reviews", async (context) => {
  const { data, error } = await getAdminSupabase().from("reviews").select("*,products(name,image)").eq("user_id", context.var.currentUser!.id).neq("status", "deleted").order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "리뷰를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ reviews: data ?? [] }));
});
myPageRouter.post("/reviews", async (context) => {
  const parsed = z.object({ orderItemId: z.string().uuid(), rating: z.number().int().min(1).max(5), content: z.string().min(2).max(1000), images: z.array(reviewImageRef).max(5, "사진은 최대 5장까지 첨부할 수 있습니다.").optional() }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "리뷰 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: item } = await supabase.from("order_items").select("id,product_id,orders!inner(user_id,order_status,pickup_status)").eq("id", parsed.data.orderItemId).eq("orders.user_id", context.var.currentUser!.id).eq("orders.order_status", "completed").eq("orders.pickup_status", "collected").maybeSingle();
  if (!item) return context.json(apiFailure("REVIEW_NOT_ELIGIBLE", "수령 완료한 본인 주문 상품만 리뷰를 작성할 수 있습니다."), 403);
  const imageUrls = (parsed.data.images ?? []).map(resolveImageRef);
  const { data, error } = await supabase.from("reviews").insert({ user_id: context.var.currentUser!.id, product_id: item.product_id, order_item_id: item.id, rating: parsed.data.rating, content: parsed.data.content, image_urls: imageUrls }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "이미 리뷰를 작성했거나 저장에 실패했습니다."), 409) : context.json(apiSuccess({ review: data }), 201);
});
myPageRouter.patch("/reviews/:id", async (context) => {
  const parsed = z.object({ rating: z.number().int().min(1).max(5).optional(), content: z.string().min(2).max(1000).optional(), images: z.array(reviewImageRef).max(5, "사진은 최대 5장까지 첨부할 수 있습니다.").optional() }).strict().refine((value) => Object.keys(value).length > 0).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "리뷰 정보를 확인하세요."), 400);
  const { images, ...rest } = parsed.data;
  const update = { ...rest, ...(images !== undefined ? { image_urls: images.map(resolveImageRef) } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await getAdminSupabase().from("reviews").update(update).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).neq("status", "deleted").select().maybeSingle();
  return error || !data ? context.json(apiFailure("NOT_FOUND", "리뷰를 찾을 수 없습니다."), 404) : context.json(apiSuccess({ review: data }));
});
myPageRouter.delete("/reviews/:id", async (context) => {
  const { data } = await getAdminSupabase().from("reviews").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return data ? context.json(apiSuccess({ deleted: true })) : context.json(apiFailure("NOT_FOUND", "리뷰를 찾을 수 없습니다."), 404);
});
myPageRouter.post("/reviews/image-upload-url", async (context) => {
  const parsed = z.object({ fileName: z.string().min(1).max(120).regex(/\.(?:jpe?g|png|webp)$/i), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(config.maxImageBytes) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_IMAGE", "JPG·PNG·WEBP 이미지만 제한 크기 내에서 업로드할 수 있습니다."), 400);
  const objectPath = `reviews/${context.var.currentUser!.id}/${crypto.randomUUID()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { data, error } = await getAdminSupabase().storage.from(config.productImageBucket).createSignedUploadUrl(objectPath);
  return error ? context.json(apiFailure("UPLOAD_URL_FAILED", "이미지 업로드 URL을 만들지 못했습니다."), 502) : context.json(apiSuccess({ bucket: config.productImageBucket, objectPath, signedUrl: data.signedUrl, token: data.token }));
});

myPageRouter.use("/restock-requests", requireAuth);
myPageRouter.use("/restock-requests/*", requireAuth);
myPageRouter.get("/restock-requests", async (context) => {
  const { data, error } = await getAdminSupabase().from("restock_requests").select("*,products(name,image)").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "재입고 요청을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ requests: data ?? [] }));
});
myPageRouter.post("/restock-requests", async (context) => {
  const parsed = z.object({ orderItemId: z.string().uuid(), message: z.string().max(500).default("") }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "재입고 요청 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: item } = await supabase.from("order_items").select("id,product_id,orders!inner(user_id)").eq("id", parsed.data.orderItemId).eq("orders.user_id", context.var.currentUser!.id).maybeSingle();
  if (!item) return context.json(apiFailure("NOT_ELIGIBLE", "본인이 주문한 상품만 재입고를 요청할 수 있습니다."), 403);
  const { data: pending } = await supabase.from("restock_requests").select("id").eq("product_id", item.product_id).eq("user_id", context.var.currentUser!.id).eq("status", "pending").maybeSingle();
  if (pending) return context.json(apiFailure("ALREADY_REQUESTED", "이미 답변 대기 중인 재입고 요청이 있습니다."), 409);
  const { data, error } = await supabase.from("restock_requests").insert({ product_id: item.product_id, user_id: context.var.currentUser!.id, order_item_id: item.id, message: parsed.data.message }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "재입고 요청을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ request: data }), 201);
});

myPageRouter.use("/wishlist", requireAuth);
myPageRouter.use("/wishlist/*", requireAuth);
myPageRouter.get("/wishlist", async (context) => {
  const { data, error } = await getAdminSupabase().from("wishlist_items").select("id,product_id,created_at,products(id,name,image,category,regular_price,status,deals(id,deal_price,status,starts_at,ends_at))").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  if (error) return context.json(apiFailure("QUERY_FAILED", "찜 목록을 조회하지 못했습니다."), 502);
  const items = (data ?? []).map((row) => ({ id: row.id, productId: row.product_id, createdAt: row.created_at, ...serializeCatalogItem(row.products as unknown as ProductWithDealsRow | null) }));
  return context.json(apiSuccess({ items }));
});
myPageRouter.get("/wishlist/ids", async (context) => {
  const { data, error } = await getAdminSupabase().from("wishlist_items").select("product_id").eq("user_id", context.var.currentUser!.id);
  return error ? context.json(apiFailure("QUERY_FAILED", "찜 목록을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ productIds: (data ?? []).map((row) => row.product_id) }));
});
myPageRouter.post("/wishlist/:productId/toggle", async (context) => {
  const supabase = getAdminSupabase(); const key = { user_id: context.var.currentUser!.id, product_id: context.req.param("productId") };
  const { data: existing } = await supabase.from("wishlist_items").select("id").match(key).maybeSingle();
  if (existing) { const { error } = await supabase.from("wishlist_items").delete().match(key); return error ? context.json(apiFailure("SAVE_FAILED", "찜을 해제하지 못했습니다."), 400) : context.json(apiSuccess({ liked: false })); }
  const { error } = await supabase.from("wishlist_items").insert(key);
  // 중복 클릭·다른 탭으로 동시에 눌러 유니크 제약 위반이 나면, 이미 원하는 상태(찜됨)이므로 성공 처리합니다.
  return error && error.code !== "23505" ? context.json(apiFailure("SAVE_FAILED", "찜하지 못했습니다."), 400) : context.json(apiSuccess({ liked: true }), 201);
});

myPageRouter.use("/cart", requireAuth);
myPageRouter.use("/cart/*", requireAuth);
myPageRouter.get("/cart", async (context) => {
  const { data, error } = await getAdminSupabase().from("cart_items").select("id,product_id,quantity,created_at,products(id,name,image,category,regular_price,status,deals(id,deal_price,status,starts_at,ends_at))").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  if (error) return context.json(apiFailure("QUERY_FAILED", "장바구니를 조회하지 못했습니다."), 502);
  const items = (data ?? []).map((row) => ({ id: row.id, productId: row.product_id, quantity: row.quantity, createdAt: row.created_at, ...serializeCatalogItem(row.products as unknown as ProductWithDealsRow | null) }));
  return context.json(apiSuccess({ items }));
});
myPageRouter.post("/cart", async (context) => {
  const parsed = z.object({ productId: z.string().min(1).max(120), quantity: z.number().int().min(1).max(20).default(1) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "장바구니 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: product } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("status", "active").maybeSingle();
  if (!product) return context.json(apiFailure("NOT_FOUND", "판매 중인 상품을 찾을 수 없습니다."), 404);
  const { data: existing } = await supabase.from("cart_items").select("id,quantity").eq("user_id", context.var.currentUser!.id).eq("product_id", parsed.data.productId).maybeSingle();
  if (existing) {
    const nextQuantity = Math.min(20, existing.quantity + parsed.data.quantity);
    const { data, error } = await supabase.from("cart_items").update({ quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
    return error ? context.json(apiFailure("SAVE_FAILED", "장바구니에 담지 못했습니다."), 400) : context.json(apiSuccess({ item: data }));
  }
  const { data, error } = await supabase.from("cart_items").insert({ user_id: context.var.currentUser!.id, product_id: parsed.data.productId, quantity: parsed.data.quantity }).select().single();
  if (!error) return context.json(apiSuccess({ item: data }), 201);
  // 동시에 같은 상품을 두 번 담으면(중복 클릭, 다른 탭) 유니크 제약 위반이 나는데, 이건 진짜 실패가
  // 아니라 다른 요청이 먼저 넣은 것뿐이라 재조회해서 수량을 합산합니다.
  if (error.code === "23505") {
    const { data: retryExisting } = await supabase.from("cart_items").select("id,quantity").eq("user_id", context.var.currentUser!.id).eq("product_id", parsed.data.productId).maybeSingle();
    if (retryExisting) {
      const nextQuantity = Math.min(20, retryExisting.quantity + parsed.data.quantity);
      const { data: updated, error: updateError } = await supabase.from("cart_items").update({ quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", retryExisting.id).select().single();
      return updateError ? context.json(apiFailure("SAVE_FAILED", "장바구니에 담지 못했습니다."), 400) : context.json(apiSuccess({ item: updated }));
    }
  }
  return context.json(apiFailure("SAVE_FAILED", "장바구니에 담지 못했습니다."), 400);
});
myPageRouter.patch("/cart/:id", async (context) => {
  const parsed = z.object({ quantity: z.number().int().min(1).max(20) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "수량을 확인하세요."), 400);
  const { data, error } = await getAdminSupabase().from("cart_items").update({ quantity: parsed.data.quantity, updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select().maybeSingle();
  return error || !data ? context.json(apiFailure("NOT_FOUND", "장바구니 항목을 찾을 수 없습니다."), 404) : context.json(apiSuccess({ item: data }));
});
myPageRouter.delete("/cart/:id", async (context) => {
  const { data } = await getAdminSupabase().from("cart_items").delete().eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return data ? context.json(apiSuccess({ deleted: true })) : context.json(apiFailure("NOT_FOUND", "장바구니 항목을 찾을 수 없습니다."), 404);
});
myPageRouter.delete("/cart", async (context) => {
  const { error } = await getAdminSupabase().from("cart_items").delete().eq("user_id", context.var.currentUser!.id);
  return error ? context.json(apiFailure("SAVE_FAILED", "장바구니를 비우지 못했습니다."), 400) : context.json(apiSuccess({ cleared: true }));
});

myPageRouter.use("/notifications", requireAuth);
myPageRouter.use("/notifications/*", requireAuth);
myPageRouter.get("/notifications", async (context) => {
  const { data, error } = await getAdminSupabase().from("notifications").select("*").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false }).limit(50);
  return error ? context.json(apiFailure("QUERY_FAILED", "알림을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ notifications: data ?? [], unreadCount: (data ?? []).filter((row) => !row.read_at).length }));
});
myPageRouter.post("/notifications/:id/read", async (context) => {
  const { data, error } = await getAdminSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return error || !data ? context.json(apiFailure("NOT_FOUND", "알림을 찾을 수 없습니다."), 404) : context.json(apiSuccess({ read: true }));
});
myPageRouter.post("/notifications/read-all", async (context) => {
  const { error } = await getAdminSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.var.currentUser!.id).is("read_at", null);
  return error ? context.json(apiFailure("SAVE_FAILED", "알림을 읽음 처리하지 못했습니다."), 400) : context.json(apiSuccess({ read: true }));
});
