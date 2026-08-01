/**
 * 관리자 대시보드·카테고리 자료조사·사용자 목록 API를 제공합니다.
 * 프론트 AdminPage의 통계와 관리 화면이 admin 역할로만 사용합니다.
 * 모든 경로에서 admin 권한을 다시 확인하고 Supabase 스냅샷임을 표시합니다.
 */
import { Hono } from "hono";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const adminRouter = new Hono();
const adminOnly = requireRole("admin");

adminRouter.get("/admin-dashboard", adminOnly, async (context) => {
  const supabase = getAdminSupabase();
  const tables = ["profiles", "products", "deals", "inquiries", "reviews"];
  const values = await Promise.all(
    tables.map((table) => supabase.from(table).select("*", { count: "exact", head: true })),
  );
  return context.json(apiSuccess({
    dashboard: Object.fromEntries(tables.map((table, index) => [table, values[index].count ?? 0])),
  }));
});

adminRouter.get("/admin-research", adminOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("products").select("category,regular_price");
  if (error) return context.json(apiFailure("QUERY_FAILED", error.message), 502);
  const groups = new Map<string, number[]>();
  for (const item of data ?? []) {
    const prices = groups.get(item.category) ?? [];
    prices.push(item.regular_price);
    groups.set(item.category, prices);
  }
  return context.json(apiSuccess({
    research: {
      generatedAt: new Date().toISOString(),
      source: "supabase_snapshot",
      categories: [...groups].map(([category, prices]) => ({
        category,
        productCount: prices.length,
        averagePrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      })),
    },
  }));
});

adminRouter.get("/admin-users", adminOnly, async (context) => {
  const { data, error } = await getAdminSupabase()
    .from("profiles")
    .select("id,name,role,created_at")
    .order("created_at", { ascending: false });
  return error
    ? context.json(apiFailure("QUERY_FAILED", error.message), 502)
    : context.json(apiSuccess({ users: data ?? [] }));
});
