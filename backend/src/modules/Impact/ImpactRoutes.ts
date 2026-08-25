/**
 * 소상공인 폐기 손실 예방·소비자 절약액을 실제 완료 주문 데이터로 집계하는 공익 임팩트 통계입니다.
 * 정가는 주문 시점 값이 별도로 저장돼 있지 않아 상품의 현재 regular_price로 근사 계산합니다.
 * 수령 완료(completed·collected)된 주문만 집계해 확정된 실적만 보여줍니다.
 */
import { Hono } from "hono";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const impactRouter = new Hono();

type ImpactRow = {
  unit_price: number;
  quantity: number;
  deal_id: string | null;
  order_id: string;
  products: { regular_price: number; seller_id: string | null } | null;
  orders: { user_id: string } | null;
};

function summarize(rows: ImpactRow[]) {
  let totalSavings = 0;
  let rescuedItems = 0;
  const sellers = new Set<string>();
  const buyers = new Set<string>();
  const orderIds = new Set<string>();
  for (const row of rows) {
    const regularPrice = row.products?.regular_price ?? row.unit_price;
    const savings = Math.max(0, regularPrice - row.unit_price) * row.quantity;
    totalSavings += savings;
    if (row.deal_id) rescuedItems += row.quantity;
    if (row.products?.seller_id) sellers.add(row.products.seller_id);
    if (row.orders?.user_id) buyers.add(row.orders.user_id);
    orderIds.add(row.order_id);
  }
  return { totalSavings, rescuedItems, participatingSellers: sellers.size, participatingBuyers: buyers.size, orderCount: orderIds.size };
}

impactRouter.get("/impact", async (context) => {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("order_items")
    .select("unit_price,quantity,deal_id,order_id,products(regular_price,seller_id),orders!inner(user_id,order_status,pickup_status)")
    .eq("orders.order_status", "completed")
    .eq("orders.pickup_status", "collected");
  if (error) return context.json(apiFailure("QUERY_FAILED", "임팩트 통계를 집계하지 못했습니다."), 502);
  const summary = summarize((data ?? []) as unknown as ImpactRow[]);
  return context.json(apiSuccess({ ...summary, generatedAt: new Date().toISOString() }));
});

impactRouter.get("/me/impact", requireAuth, async (context) => {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("order_items")
    .select("unit_price,quantity,deal_id,order_id,products(regular_price,seller_id),orders!inner(user_id,order_status,pickup_status)")
    .eq("orders.order_status", "completed")
    .eq("orders.pickup_status", "collected")
    .eq("orders.user_id", context.var.currentUser!.id);
  if (error) return context.json(apiFailure("QUERY_FAILED", "나의 절약 리포트를 집계하지 못했습니다."), 502);
  const summary = summarize((data ?? []) as unknown as ImpactRow[]);
  return context.json(apiSuccess({ totalSavings: summary.totalSavings, rescuedItems: summary.rescuedItems, orderCount: summary.orderCount }));
});
