/**
 * 판매자 상품 조회·등록·수정과 판매자 대시보드 통계 API를 제공합니다.
 * 프론트 SellerPage가 seller 또는 admin 역할로 이 보호 모듈을 사용합니다.
 * 상품 수정은 요청 사용자 seller_id 범위로 제한해 다른 판매자 데이터를 보호합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const sellerRouter = new Hono();
const sellerOrAdmin = requireRole("seller", "admin");

sellerRouter.get("/seller-products", sellerOrAdmin, async (context) => {
  const { data, error } = await getAdminSupabase()
    .from("products")
    .select("*")
    .eq("seller_id", context.var.currentUser!.id);
  return error
    ? context.json(apiFailure("QUERY_FAILED", error.message), 502)
    : context.json(apiSuccess({ products: data ?? [] }));
});

sellerRouter.post("/seller-products", sellerOrAdmin, async (context) => {
  const parsed = z.object({
    name: z.string().min(2),
    description: z.string().min(2),
    category: z.string().min(1),
    image: z.string().min(1),
    regularPrice: z.number().int().positive(),
    inventory: z.number().int().nonnegative(),
  }).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "상품 정보를 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("products")
    .insert({
      seller_id: context.var.currentUser!.id,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      image: parsed.data.image,
      regular_price: parsed.data.regularPrice,
      inventory: parsed.data.inventory,
      status: "draft",
    })
    .select()
    .single();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ product: data }), 201);
});

sellerRouter.patch("/seller-products/:id", sellerOrAdmin, async (context) => {
  const parsed = z.record(z.unknown()).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "수정 정보를 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("products")
    .update(parsed.data)
    .eq("id", context.req.param("id"))
    .eq("seller_id", context.var.currentUser!.id)
    .select()
    .maybeSingle();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ product: data }));
});

sellerRouter.get("/seller-dashboard", sellerOrAdmin, async (context) => {
  const supabase = getAdminSupabase();
  const sellerId = context.var.currentUser!.id;
  const [{ count: products }, { count: inquiries }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", sellerId),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("audience", "seller"),
  ]);
  return context.json(apiSuccess({
    dashboard: { productCount: products ?? 0, inquiryCount: inquiries ?? 0, mode: "supabase" },
  }));
});
