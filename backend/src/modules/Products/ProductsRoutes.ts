/**
 * 상품·타임딜 목록과 상세 공개 조회 API를 제공합니다.
 * Supabase 미연결 시 샘플은 개발의 명시적 ENABLE_SAMPLE_DATA=true에서만 반환합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config, isSupabaseConfigured } from "../../config.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
import { sampleDeals, sampleProducts } from "../../sample.js";
export const catalogRouter = new Hono();
const unavailable = () => ({ body: apiFailure("SUPABASE_UNCONFIGURED", "운영 카탈로그 데이터베이스가 연결되지 않았습니다."), status: 503 as const });
catalogRouter.get("/catalog", async (context) => {
  if (!isSupabaseConfigured()) { if (!config.enableSampleData) { const result = unavailable(); return context.json(result.body, result.status); } return context.json(apiSuccess({ catalog: sampleProducts, source: "sample", notice: "개발 전용 샘플이며 운영 데이터가 아닙니다." })); }
  const { data, error } = await getAdminSupabase().from("products").select("id,name,description,category,image,image_path,regular_price,status,inventory").eq("status", "active"); if (error) return context.json(apiFailure("QUERY_FAILED", "상품을 조회하지 못했습니다."), 502); return context.json(apiSuccess({ catalog: (data ?? []).map((product) => ({ ...product, regularPrice: product.regular_price })), source: "supabase" }));
});
catalogRouter.get("/catalog/:id", async (context) => {
  if (!isSupabaseConfigured()) { if (!config.enableSampleData) { const result = unavailable(); return context.json(result.body, result.status); } const product = sampleProducts.find((item) => item.id === context.req.param("id")); return product ? context.json(apiSuccess({ product, source: "sample" })) : context.json(apiFailure("NOT_FOUND", "상품을 찾을 수 없습니다."), 404); }
  const { data, error } = await getAdminSupabase().from("products").select("*").eq("id", context.req.param("id")).eq("status", "active").maybeSingle(); if (error) return context.json(apiFailure("QUERY_FAILED", "상품을 조회하지 못했습니다."), 502); return data ? context.json(apiSuccess({ product: data, source: "supabase" })) : context.json(apiFailure("NOT_FOUND", "상품을 찾을 수 없습니다."), 404);
});
catalogRouter.get("/deals", async (context) => {
  if (!isSupabaseConfigured()) { if (!config.enableSampleData) { const result = unavailable(); return context.json(result.body, result.status); } return context.json(apiSuccess({ deals: sampleDeals, source: "sample", notice: "개발 전용 샘플이며 운영 데이터가 아닙니다." })); }
  const { data, error } = await getAdminSupabase().from("deals").select("*,product:products(*)").eq("status", "active").lte("starts_at", new Date().toISOString()).gt("ends_at", new Date().toISOString()); if (error) return context.json(apiFailure("QUERY_FAILED", "타임딜을 조회하지 못했습니다."), 502); return context.json(apiSuccess({ deals: (data ?? []).map((deal) => ({ ...deal, productId: deal.product_id, dealPrice: deal.deal_price, startsAt: deal.starts_at, endsAt: deal.ends_at, progress: Math.round(deal.participants / deal.target * 100), product: deal.product ? { ...deal.product, regularPrice: deal.product.regular_price } : null })), source: "supabase" }));
});
catalogRouter.get("/deals/:id", async (context) => { if (!isSupabaseConfigured()) { if (!config.enableSampleData) { const result = unavailable(); return context.json(result.body, result.status); } const deal = sampleDeals.find((item) => item.id === context.req.param("id")); return deal ? context.json(apiSuccess({ deal, source: "sample" })) : context.json(apiFailure("NOT_FOUND", "딜을 찾을 수 없습니다."), 404); } const { data, error } = await getAdminSupabase().from("deals").select("*,product:products(*)").eq("id", context.req.param("id")).maybeSingle(); if (error) return context.json(apiFailure("QUERY_FAILED", "딜을 조회하지 못했습니다."), 502); return data ? context.json(apiSuccess({ deal: data, source: "supabase" })) : context.json(apiFailure("NOT_FOUND", "딜을 찾을 수 없습니다."), 404); });

catalogRouter.get("/products/:id/reviews", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiSuccess({ reviews: [] }));
  const { data, error } = await getAdminSupabase().from("reviews").select("id,rating,content,image_urls,created_at,profiles(name)").eq("product_id", context.req.param("id")).eq("status", "visible").order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "리뷰를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ reviews: data ?? [] }));
});
catalogRouter.get("/products/:id/reopen-request-count", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiSuccess({ count: 0, requested: false }));
  const { count, error } = await getAdminSupabase().from("reopen_requests").select("*", { count: "exact", head: true }).eq("product_id", context.req.param("id"));
  return error ? context.json(apiFailure("QUERY_FAILED", "재오픈 요청 수를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ count: count ?? 0 }));
});
catalogRouter.post("/products/:id/reopen-request", requireAuth, async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 연결 전에는 요청을 저장할 수 없습니다."), 503);
  const productId = context.req.param("id"); const supabase = getAdminSupabase();
  const { data: product } = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) return context.json(apiFailure("NOT_FOUND", "상품을 찾을 수 없습니다."), 404);
  const userId = context.var.currentUser!.id;
  const { data: existing } = await supabase.from("reopen_requests").select("id").eq("product_id", productId).eq("user_id", userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("reopen_requests").delete().eq("id", existing.id);
    if (error) return context.json(apiFailure("DELETE_FAILED", "요청을 취소하지 못했습니다."), 500);
    const { count } = await supabase.from("reopen_requests").select("*", { count: "exact", head: true }).eq("product_id", productId);
    return context.json(apiSuccess({ requested: false, count: count ?? 0 }));
  }
  const { error } = await supabase.from("reopen_requests").insert({ product_id: productId, user_id: userId });
  if (error) return context.json(apiFailure("SAVE_FAILED", "요청을 저장하지 못했습니다."), 500);
  const { count } = await supabase.from("reopen_requests").select("*", { count: "exact", head: true }).eq("product_id", productId);
  return context.json(apiSuccess({ requested: true, count: count ?? 0 }), 201);
});

// ── 실제 검색 데이터를 쌓아 인기 검색어를 계산합니다. 로그인 여부와 무관하게 기록합니다. ──
catalogRouter.post("/search-log", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiSuccess({ logged: false }));
  const parsed = z.object({ term: z.string().min(1).max(60) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "검색어를 확인하세요."), 400);
  const term = parsed.data.term.trim();
  if (!term) return context.json(apiFailure("INVALID_INPUT", "검색어를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: existing } = await supabase.from("search_terms").select("search_count").eq("term", term).maybeSingle();
  const { error } = await supabase.from("search_terms").upsert({ term, search_count: (existing?.search_count ?? 0) + 1, last_searched_at: new Date().toISOString() });
  return error ? context.json(apiFailure("SAVE_FAILED", "검색어를 기록하지 못했습니다."), 400) : context.json(apiSuccess({ logged: true }));
});
catalogRouter.get("/search-terms/popular", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiSuccess({ terms: [] }));
  const { data, error } = await getAdminSupabase().from("search_terms").select("term,search_count").order("search_count", { ascending: false }).limit(10);
  return error ? context.json(apiFailure("QUERY_FAILED", "인기 검색어를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ terms: (data ?? []).map((row) => row.term) }));
});
