/**
 * 브라우저 Supabase Auth 세션을 기존 Render API Bearer 세션으로 연결하는 모듈입니다.
 * 카카오 OAuth 후 프론트가 받은 access token을 서버에서 다시 검증하고,
 * 현재 프로젝트가 사용하던 `timedeal-access-token` 계약을 유지하도록 같은 토큰을 반환합니다.
 * service role key는 서버 검증에만 사용되며 프론트 응답에는 노출되지 않습니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { getAdminSupabase } from "../../supabase.js";

export const supabaseSessionRouter = new Hono();
const input = z.object({ accessToken: z.string().min(20) });

supabaseSessionRouter.post("/exchange", async (c) => {
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiFailure("INVALID_INPUT", "Supabase access token을 확인하세요."), 400);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.auth.getUser(parsed.data.accessToken);
    if (error || !data.user) return c.json(apiFailure("INVALID_SESSION", "Supabase 세션이 유효하지 않습니다."), 401);
    const { data: profile } = await supabase.from("profiles").select("name,role").eq("id", data.user.id).maybeSingle();
    return c.json(apiSuccess({
      accessToken: parsed.data.accessToken,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name: profile?.name ?? String(data.user.user_metadata?.name ?? "사용자"),
        emailVerified: Boolean(data.user.email_confirmed_at),
        role: profile?.role ?? "user",
      },
    }));
  } catch {
    return c.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 먼저 설정하세요."), 503);
  }
});
