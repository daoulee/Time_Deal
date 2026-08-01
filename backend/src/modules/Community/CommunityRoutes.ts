/**
 * 공개 커뮤니티 게시글 목록과 로그인 사용자의 글 작성 API를 제공합니다.
 * 프론트 CommunityPage가 `/api/community` 경로로 조회·작성합니다.
 * 조회는 visible 상태만 반환하고 쓰기는 인증 사용자 id로 저장합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const communityRouter = new Hono();

communityRouter.get("/community", async (context) => {
  const { data, error } = await getAdminSupabase()
    .from("community_posts")
    .select("*")
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(100);
  return error
    ? context.json(apiFailure("QUERY_FAILED", error.message), 502)
    : context.json(apiSuccess({ posts: data ?? [] }));
});

communityRouter.post("/community", requireAuth, async (context) => {
  const parsed = z.object({
    title: z.string().min(2).max(120),
    content: z.string().min(2).max(3000),
    purchaseIntent: z.boolean().default(false),
  }).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "게시글을 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("community_posts")
    .insert({
      user_id: context.var.currentUser!.id,
      title: parsed.data.title,
      content: parsed.data.content,
      purchase_intent: parsed.data.purchaseIntent,
    })
    .select()
    .single();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ post: data }), 201);
});
