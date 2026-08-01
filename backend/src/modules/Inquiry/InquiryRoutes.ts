/**
 * 로그인 사용자의 문의 조회와 고객용·판매자용 문의 등록 API를 제공합니다.
 * 프론트 InquiryPage와 MyPage 문의 영역이 audience 구분을 사용합니다.
 * 입력 검증과 currentUser 소유권을 통과한 데이터만 Supabase에 저장합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";

export const inquiryRouter = new Hono();

inquiryRouter.get("/inquiries", requireAuth, async (context) => {
  const { data, error } = await getAdminSupabase()
    .from("inquiries")
    .select("*")
    .eq("user_id", context.var.currentUser!.id)
    .order("created_at", { ascending: false });
  return error
    ? context.json(apiFailure("QUERY_FAILED", error.message), 502)
    : context.json(apiSuccess({ inquiries: data ?? [] }));
});

inquiryRouter.post("/inquiries", requireAuth, async (context) => {
  const parsed = z.object({
    productId: z.string().optional(),
    audience: z.enum(["customer", "seller"]),
    subject: z.string().min(2).max(120),
    message: z.string().min(5).max(3000),
  }).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "문의 내용을 확인하세요."), 400);
  const { data, error } = await getAdminSupabase()
    .from("inquiries")
    .insert({
      user_id: context.var.currentUser!.id,
      product_id: parsed.data.productId ?? null,
      audience: parsed.data.audience,
      subject: parsed.data.subject,
      message: parsed.data.message,
    })
    .select()
    .single();
  return error
    ? context.json(apiFailure("SAVE_FAILED", error.message), 400)
    : context.json(apiSuccess({ inquiry: data }), 201);
});
