/**
 * 로그인 사용자의 딜 참여·리뷰·프로필 조회와 저장 API를 제공합니다.
 * 프론트 MyPage와 상품 참여 흐름이 이 모듈의 보호 경로를 사용합니다.
 * 모든 행은 currentUser id 기준으로 조회·생성해 사용자 간 데이터를 분리합니다.
 */
import { Hono, type Context } from "hono";
import { z, type ZodTypeAny } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const myPageRouter = new Hono();

const body = async (context: Context, schema: ZodTypeAny) => {
  const parsed = schema.safeParse(await context.req.json().catch(() => null));
  return parsed.success ? parsed.data : null;
};

const listMine = (path: string, table: string) =>
  myPageRouter.get(path, requireAuth, async (context) => {
    const { data, error } = await getAdminSupabase()
      .from(table)
      .select("*")
      .eq("user_id", context.var.currentUser!.id)
      .order("created_at", { ascending: false });
    return error
      ? context.json(apiFailure("QUERY_FAILED", error.message), 502)
      : context.json(apiSuccess({ [table]: data ?? [] }));
  });

listMine("/participations", "participations");
myPageRouter.post("/participations", requireAuth, async (context) => {
  const value = await body(context, z.object({ dealId: z.string().min(1), quantity: z.number().int().min(1).max(20) }));
  if (!value) return context.json(apiFailure("INVALID_INPUT", "참여 정보를 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("participations")
    .insert({ user_id: context.var.currentUser!.id, deal_id: value.dealId, quantity: value.quantity })
    .select()
    .single();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ participation: data }), 201);
});

listMine("/reviews", "reviews");
myPageRouter.post("/reviews", requireAuth, async (context) => {
  const value = await body(context, z.object({
    productId: z.string(),
    rating: z.number().int().min(1).max(5),
    content: z.string().min(2).max(1000),
  }));
  if (!value) return context.json(apiFailure("INVALID_INPUT", "리뷰를 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("reviews")
    .insert({ user_id: context.var.currentUser!.id, product_id: value.productId, rating: value.rating, content: value.content })
    .select()
    .single();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ review: data }), 201);
});

myPageRouter.get("/me/profile", requireAuth, (context) =>
  context.json(apiSuccess({ profile: context.var.currentUser })),
);
