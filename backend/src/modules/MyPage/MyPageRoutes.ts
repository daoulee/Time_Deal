/**
 * 로그인 사용자의 프로필·관심 지역·주문 기반 참여 딜·구매 검증 리뷰 API를 제공합니다.
 * service-role 사용 시에도 모든 조회·변경을 currentUser 소유 범위로 제한합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const myPageRouter = new Hono();
myPageRouter.use("/me/*", requireAuth);
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
  const parsed = z.object({ orderItemId: z.string().uuid(), rating: z.number().int().min(1).max(5), content: z.string().min(2).max(1000) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "리뷰 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: item } = await supabase.from("order_items").select("id,product_id,orders!inner(user_id,order_status,pickup_status)").eq("id", parsed.data.orderItemId).eq("orders.user_id", context.var.currentUser!.id).eq("orders.order_status", "completed").eq("orders.pickup_status", "collected").maybeSingle();
  if (!item) return context.json(apiFailure("REVIEW_NOT_ELIGIBLE", "수령 완료한 본인 주문 상품만 리뷰를 작성할 수 있습니다."), 403);
  const { data, error } = await supabase.from("reviews").insert({ user_id: context.var.currentUser!.id, product_id: item.product_id, order_item_id: item.id, rating: parsed.data.rating, content: parsed.data.content }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "이미 리뷰를 작성했거나 저장에 실패했습니다."), 409) : context.json(apiSuccess({ review: data }), 201);
});
myPageRouter.patch("/reviews/:id", async (context) => {
  const parsed = z.object({ rating: z.number().int().min(1).max(5).optional(), content: z.string().min(2).max(1000).optional() }).strict().refine((value) => Object.keys(value).length > 0).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "리뷰 정보를 확인하세요."), 400);
  const { data, error } = await getAdminSupabase().from("reviews").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).neq("status", "deleted").select().maybeSingle();
  return error || !data ? context.json(apiFailure("NOT_FOUND", "리뷰를 찾을 수 없습니다."), 404) : context.json(apiSuccess({ review: data }));
});
myPageRouter.delete("/reviews/:id", async (context) => {
  const { data } = await getAdminSupabase().from("reviews").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return data ? context.json(apiSuccess({ deleted: true })) : context.json(apiFailure("NOT_FOUND", "리뷰를 찾을 수 없습니다."), 404);
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
